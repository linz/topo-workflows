import { fsa } from '@chunkd/fs';
import { command, option, optional, string } from 'cmd-ts';
import type { StacCollection } from 'stac-ts';
import ulid from 'ulid';

import { CliInfo } from '../../cli.info.ts';
import { logger } from '../../log.ts';
import { protocolAwareString } from '../../utils/filelist.ts';
import type { GeospatialDataCategory, StacCollectionLinz } from '../../utils/metadata.ts';
import { slugify } from '../../utils/slugify.ts';
import { config, MeterAsString, registerCli, Url, UrlFolder, urlPathEndsWith, verbose } from '../common.ts';
import { loadFirstTiff } from '../generate-path/path.generate.ts';

export interface SlugMetadata {
  geospatialCategory: GeospatialDataCategory;
  geographicDescription?: string;
  region: string;
  /** Optional survey ID if it exists, e.g. SN8066, commonly used with scanned historical imagery */
  surveyId?: string;
  date: string;
  gsd: string;
}

export const commandStacSetup = command({
  name: 'stac-setup',
  description:
    'Collection-related STAC metadata setup. Outputs collection-id and linz-slug files within /tmp/stac-setup/',
  version: CliInfo.version,
  args: {
    config,
    verbose,

    startDate: option({
      type: optional(string),
      long: 'start-date',
      description: 'End date of survey capture (YYYY-MM-DD), eg 2023-01-01',
    }),

    startYear: option({
      type: optional(string),
      long: 'start-year',
      description: 'Start year of survey capture, deprecated use --start-date',
    }),

    endDate: option({
      type: optional(string),
      long: 'end-date',
      description: 'End date of survey capture (YYYY-MM-DD), eg 2024-05-23',
    }),

    endYear: option({
      type: optional(string),
      long: 'end-year',
      description: 'End year of survey capture, deprecated use --end-date',
    }),

    gsd: option({
      type: MeterAsString,
      long: 'gsd',
      description: 'GSD of dataset, e.g. 0.3',
    }),

    region: option({
      type: string,
      long: 'region',
      description: 'Region of dataset',
    }),

    geographicDescription: option({
      type: optional(string),
      long: 'geographic-description',
      description: 'Geographic description of dataset',
    }),

    surveyId: option({
      type: optional(string),
      long: 'survey-id',
      description: 'Associated survey id, eg SN8066 or SNC20505',
    }),

    geospatialCategory: option({
      type: string,
      long: 'geospatial-category',
      description: 'Geospatial category of dataset',
    }),

    odrUrl: option({
      type: optional(Url),
      long: 'odr-url',
      description: 'Open Data Registry URL of existing dataset',
    }),

    output: option({
      type: UrlFolder,
      long: 'output',
      description: 'Where to store output files',
      defaultValueIsSerializable: true,
      defaultValue: () => fsa.toUrl('file:///tmp/stac-setup/'),
    }),
  },

  async handler(args) {
    registerCli(this, args);
    const startTime = performance.now();

    logger.info('StacSetup:Start');
    if (args.odrUrl) {
      const collectionLocation = urlPathEndsWith(args.odrUrl, '/collection.json')
        ? args.odrUrl
        : new URL('collection.json', args.odrUrl);
      const collection = await fsa.readJson<StacCollection & StacCollectionLinz>(collectionLocation);
      if (collection == null)
        throw new Error(`Failed to get collection.json from ${protocolAwareString(collectionLocation)}.`);
      const slug = collection['linz:slug'];
      if (slug !== slugify(slug)) throw new Error(`Invalid slug: ${slug}.`);

      const gsd =
        Number(collection['gsd']) || (await loadFirstTiff(collectionLocation, collection)).images[0]?.resolution[0];
      if (gsd !== Number(args.gsd)) {
        logger.error({ gsd, expected: args.gsd }, 'StacSetup:Error:GSDMismatch');
        throw new Error(`GSD at ODR URL [${gsd}] does not match new TIFF GSD [${args.gsd}]`);
      }

      const collectionId = collection['id'];
      await writeSetupFiles(slug, collectionId, args.output);
      logger.info({ duration: performance.now() - startTime, slug, collectionId }, 'StacSetup:Done');
    } else {
      if (args.startDate && args.startYear) throw new Error('--start-date and --start-year are mutually exclusive');
      if (args.endDate && args.endYear) throw new Error('--end-date and --end-year are mutually exclusive');

      const metadata: SlugMetadata = {
        geospatialCategory: args.geospatialCategory as GeospatialDataCategory,
        region: args.region,
        surveyId: args.surveyId,
        geographicDescription: args.geographicDescription,
        date: formatDate(args.startDate ?? args.startYear, args.endDate ?? args.endYear),
        gsd: args.gsd,
      };
      const slug = slugFromMetadata(metadata);
      const collectionId = ulid.ulid();
      await writeSetupFiles(slug, collectionId, args.output);
      logger.info({ duration: performance.now() - startTime, slug, collectionId }, 'StacSetup:Done');
    }
  },
});

function formatParts(...parts: string[]): string {
  return parts.filter((f) => f != null && f.length > 0).join('_');
}

/**
 * Generates slug based on dataset category.
 *
 * @param metadata
 * @returns slug
 */
export function slugFromMetadata(metadata: SlugMetadata): string {
  const geographicDescription = metadata.geographicDescription || metadata.region;

  switch (metadata.geospatialCategory) {
    case 'ancillary-aerial-photos':
    case 'near-infrared-aerial-photos':
    case 'near-infrared-satellite-imagery':
    case 'rural-aerial-photos':
    case 'satellite-imagery':
    case 'urban-aerial-photos':
      return formatParts(slugify(geographicDescription), metadata.date, `${metadata.gsd}m`);

    case 'dem':
    case 'dsm':
    case 'dem-hillshade':
    case 'dem-hillshade-igor':
    case 'dsm-hillshade':
    case 'dsm-hillshade-igor':
      return formatParts(slugify(geographicDescription), metadata.date);

    case 'scanned-aerial-photos':
      if (metadata.surveyId == null) throw new Error('Historical imagery needs a surveyId');
      return formatParts(
        slugify(geographicDescription),
        metadata.surveyId.toLowerCase(),
        metadata.date,
        `${metadata.gsd}m`,
      );

    default:
      throw new Error(
        `Slug can't be generated from collection as no matching category: ${String(metadata.geospatialCategory)}.`,
      );
  }
}

/**
 * Format a STAC collection as a "startDate-endDate" or "startDate" in Pacific/Auckland time
 * only if both "startDate" and "endDate" are defined.
 *
 * @param startDate start capture date in YYYY-MM-DD
 * @param endDate end capture date in YYYY-MM-DD
 *
 * @returns the formatted slug dates
 */
export function formatDate(startDate?: string, endDate?: string): string {
  const startPart = startDate?.slice(0, 4);
  const endPart = endDate?.slice(0, 4);
  if (startPart == null || endPart == null) return '';
  if (startPart.length === 0 || endPart.length === 0) return '';

  if (startPart === endPart) return startPart;
  return `${startPart}-${endPart}`;
}

/**
 * Write the STAC setup values to files for Argo to use
 *
 * @param slug the STAC linz:slug value to write
 * @param collectionId the STAC collection ID value to write
 * @param output the output path for the setup files
 */
async function writeSetupFiles(slug: string, collectionId: string, output: URL): Promise<void> {
  const slugPath = new URL('linz-slug', output);
  const collectionIdPath = new URL('collection-id', output);
  await fsa.write(slugPath, slug);
  await fsa.write(collectionIdPath, collectionId);
}
