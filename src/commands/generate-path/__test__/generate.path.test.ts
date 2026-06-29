import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { fsa, FsMemory } from '@chunkd/fs';

import { RgbaNztm2000Tiff } from '../../../__test__/tiff.util.ts';
import type { CommandArguments } from '../../../utils/type.util.ts';
import { UrlFolder } from '../../common.ts';
import { SampleCollection } from '../../generate-path/__test__/sample.ts';
import { FakeCogTiff } from '../../tileindex-validate/__test__/tileindex.validate.data.ts';
import type { PathMetadata } from '../path.generate.ts';
import { commandGeneratePath } from '../path.generate.ts';
import { extractEpsg, extractGsd, generatePath } from '../path.generate.ts';

describe('GeneratePathImagery', () => {
  it('Should match - urban aerial from slug', () => {
    const metadata: PathMetadata = {
      targetBucketName: 'nz-imagery',
      geospatialCategory: 'urban-aerial-photos',
      region: 'auckland',
      slug: 'auckland_2023_0.3m',
      gsd: 0.3,
      epsg: 2193,
    };
    assert.equal(generatePath(metadata), 's3://nz-imagery/auckland/auckland_2023_0.3m/rgb/2193/');
  });
  it('Should match - generic aerial photos from slug', () => {
    const metadata: PathMetadata = {
      targetBucketName: 'nz-imagery',
      geospatialCategory: 'ancillary-aerial-photos',
      region: 'auckland',
      slug: 'auckland_2023_0.3m',
      gsd: 0.3,
      epsg: 2193,
    };
    assert.equal(generatePath(metadata), 's3://nz-imagery/auckland/auckland_2023_0.3m/rgb/2193/');
  });

  it('Should match - scanned aerial photos from slug', () => {
    const metadata: PathMetadata = {
      targetBucketName: 'nz-imagery',
      geospatialCategory: 'scanned-aerial-photos',
      region: 'waikato',
      slug: 'waikato_sn11978_1992-1995_0.4m',
      gsd: 0.4,
      epsg: 2193,
    };
    assert.equal(generatePath(metadata), 's3://nz-imagery/waikato/waikato_sn11978_1992-1995_0.4m/rgb/2193/');
  });
});
it('Should match - near-infrared aerial photos from slug', () => {
  const metadata: PathMetadata = {
    targetBucketName: 'nz-imagery',
    geospatialCategory: 'near-infrared-aerial-photos',
    region: 'auckland',
    slug: 'auckland_2023_0.3m',
    gsd: 0.3,
    epsg: 2193,
  };
  assert.equal(generatePath(metadata), 's3://nz-imagery/auckland/auckland_2023_0.3m/rgbnir/2193/');
});
describe('GeneratePathHillshade', () => {
  it('Should match - DEM hillshade 8m igor', () => {
    const metadata: PathMetadata = {
      targetBucketName: 'nz-elevation',
      geospatialCategory: 'dem-hillshade-igor',
      region: 'new-zealand',
      slug: 'new-zealand-contour',
      gsd: 8,
      epsg: 2193,
    };
    assert.equal(
      generatePath(metadata),
      's3://nz-elevation/new-zealand/new-zealand-contour/dem-hillshade-igor_8m/2193/',
    );
  });
  it('Should match - DEM hillshade 8m default', () => {
    const metadata: PathMetadata = {
      targetBucketName: 'nz-elevation',
      geospatialCategory: 'dem-hillshade',
      region: 'new-zealand',
      slug: 'new-zealand-contour',
      gsd: 8,
      epsg: 2193,
    };
    assert.equal(generatePath(metadata), 's3://nz-elevation/new-zealand/new-zealand-contour/dem-hillshade_8m/2193/');
  });
  it('Should match - DEM hillshade 1m igor', () => {
    const metadata: PathMetadata = {
      targetBucketName: 'nz-elevation',
      geospatialCategory: 'dem-hillshade-igor',
      region: 'new-zealand',
      slug: 'new-zealand',
      gsd: 1,
      epsg: 2193,
    };
    assert.equal(generatePath(metadata), 's3://nz-elevation/new-zealand/new-zealand/dem-hillshade-igor_1m/2193/');
  });
  it('Should match - DEM hillshade 1m default', () => {
    const metadata: PathMetadata = {
      targetBucketName: 'nz-elevation',
      geospatialCategory: 'dem-hillshade',
      region: 'new-zealand',
      slug: 'new-zealand',
      gsd: 1,
      epsg: 2193,
    };
    assert.equal(generatePath(metadata), 's3://nz-elevation/new-zealand/new-zealand/dem-hillshade_1m/2193/');
  });
  it('Should match - DSM hillshade 1m igor', () => {
    const metadata: PathMetadata = {
      targetBucketName: 'nz-elevation',
      geospatialCategory: 'dsm-hillshade-igor',
      region: 'new-zealand',
      slug: 'new-zealand',
      gsd: 1,
      epsg: 2193,
    };
    assert.equal(generatePath(metadata), 's3://nz-elevation/new-zealand/new-zealand/dsm-hillshade-igor_1m/2193/');
  });
  it('Should match - DSM hillshade 1m default', () => {
    const metadata: PathMetadata = {
      targetBucketName: 'nz-elevation',
      geospatialCategory: 'dsm-hillshade',
      region: 'new-zealand',
      slug: 'new-zealand',
      gsd: 1,
      epsg: 2193,
    };
    assert.equal(generatePath(metadata), 's3://nz-elevation/new-zealand/new-zealand/dsm-hillshade_1m/2193/');
  });
});

describe('GeneratePathGeospatialDataCategories', () => {
  it('Should match - dem from slug', () => {
    const metadata: PathMetadata = {
      targetBucketName: 'nz-elevation',
      geospatialCategory: 'dem',
      region: 'auckland',
      slug: 'auckland_2023',
      gsd: 1,
      epsg: 2193,
    };
    assert.equal(generatePath(metadata), 's3://nz-elevation/auckland/auckland_2023/dem_1m/2193/');
  });
  it('Should match - dsm from slug', () => {
    const metadata: PathMetadata = {
      targetBucketName: 'nz-elevation',
      geospatialCategory: 'dsm',
      region: 'auckland',
      slug: 'auckland_2023',
      gsd: 1,
      epsg: 2193,
    };
    assert.equal(generatePath(metadata), 's3://nz-elevation/auckland/auckland_2023/dsm_1m/2193/');
  });
  it('Should error - invalid geospatial category', () => {
    const metadata: PathMetadata = {
      targetBucketName: 'nz-imagery',
      geospatialCategory: 'not-a-valid-category',
      region: 'wellington',
      slug: 'napier_2017-2018_0.05m',
      gsd: 0.5,
      epsg: 2193,
    };
    assert.throws(() => {
      generatePath(metadata);
    }, Error("Path can't be generated from collection as no matching category for not-a-valid-category."));
  });
});

describe('GeneratePathImagery', () => {
  it('Should match - urban aerial from slug', () => {
    const metadata: PathMetadata = {
      targetBucketName: 'nz-imagery',
      geospatialCategory: 'urban-aerial-photos',
      region: 'auckland',
      slug: 'auckland_2023_0.3m',
      gsd: 0.3,
      epsg: 2193,
    };
    assert.equal(generatePath(metadata), 's3://nz-imagery/auckland/auckland_2023_0.3m/rgb/2193/');
  });
});

describe('epsg', () => {
  const TiffEPSG = new FakeCogTiff('s3://path/fake.tiff', {
    epsg: 2193,
  });
  it('Should return EPSG code', () => {
    assert.equal(extractEpsg(TiffEPSG), '2193');
  });
  const TiffNoEPSG = new FakeCogTiff('s3://path/fake.tiff', { epsg: undefined });
  it('Should fail - unable to find EPSG code', () => {
    assert.throws(() => {
      extractEpsg(TiffNoEPSG);
    }, Error);
  });
  const TiffInvalidEPSG = new FakeCogTiff('s3://path/fake.tiff', { epsg: 2319 });
  it('Should fail - invalid EPSG code', () => {
    assert.throws(() => {
      extractEpsg(TiffInvalidEPSG);
    }, Error);
  });
});

describe('gsd', () => {
  const TiffGsd = new FakeCogTiff('s3://path/fake.tiff', {
    resolution: [0.3],
  });
  it('Should return resolution', () => {
    assert.equal(extractGsd(TiffGsd), 0.3);
  });
  const TiffNoGsd = new FakeCogTiff('s3://path/fake.tiff', {
    resolution: [],
  });
  it('Should fail - unable to find resolution', () => {
    assert.throws(() => {
      extractGsd(TiffNoGsd);
    }, Error);
  });
});

describe('metadata from collection', () => {
  it('Should return urban aerial photos path', async () => {
    const collection = structuredClone(SampleCollection);

    const metadata: PathMetadata = {
      targetBucketName: 'bucket',
      geospatialCategory: collection['linz:geospatial_category'],
      region: collection['linz:region'],
      slug: collection['linz:slug'],
      gsd: 0.3,
      epsg: 2193,
    };
    assert.equal(generatePath(metadata), 's3://bucket/manawatu-whanganui/palmerston-north_2024_0.3m/rgb/2193/');
  });
});

type CommandGeneratePathArgs = CommandArguments<typeof commandGeneratePath>;
describe('command.generatePath', () => {
  const mem = new FsMemory();
  beforeEach(() => {
    fsa.register('memory://', mem);
    fsa.register('file:///tmp/generate-args', mem);
    mem.files.clear();
  });

  const baseArgs: CommandGeneratePathArgs = {
    config: undefined,
    verbose: false,
    targetBucketName: 'some-output-bucket',
    source: fsa.toUrl(''),
  };

  it('should generate a output', async () => {
    await fsa.write(
      fsa.toUrl('memory://bucket/source/test/collection.json'),
      Buffer.from(
        JSON.stringify({
          'linz:geospatial_category': 'urban-aerial-photos',
          'linz:region': 'wellington',
          'linz:slug': 'source-test',
          links: [{ href: './BQ32.json', rel: 'item' }],
        }),
      ),
    );
    await fsa.write(
      fsa.toUrl('memory://bucket/source/test/BQ32.json'),
      Buffer.from(
        JSON.stringify({
          assets: {
            visual: {
              href: './BQ32.tiff',
            },
          },
        }),
      ),
    );
    await fsa.write(fsa.toUrl('memory://bucket/source/test/BQ32.tiff'), RgbaNztm2000Tiff);

    await commandGeneratePath.handler({ ...baseArgs, source: await UrlFolder.from('memory://bucket/source/test/') });

    const output = await fsa.read(fsa.toUrl('/tmp/generate-path/target'));
    assert.deepEqual(output.toString('utf-8'), 's3://some-output-bucket/wellington/source-test/rgb/2193/');
  });
});
