export interface StacCollectionLinz {
  'linz:lifecycle': string;
  'linz:geospatial_category': GeospatialDataCategory;
  'linz:region': string;
  'linz:slug': string;
  'linz:security_classification': string;
  'linz:event_name'?: string;
  'linz:geographic_description'?: string;
  gsd?: number;
}

export const GeospatialDataCategories = {
  AerialPhotos: 'ancillary-aerial-photos',
  NearInfraredAerialPhotos: 'near-infrared-aerial-photos',
  NearInfraredSatelliteImagery: 'near-infrared-satellite-imagery',
  RuralAerialPhotos: 'rural-aerial-photos',
  SatelliteImagery: 'satellite-imagery',
  ScannedAerialPhotos: 'scanned-aerial-photos',
  UrbanAerialPhotos: 'urban-aerial-photos',
  Dem: 'dem',
  Dsm: 'dsm',
  DemHillshade: 'dem-hillshade',
  DemHillshadeIgor: 'dem-hillshade-igor',
  DsmHillshade: 'dsm-hillshade',
  DsmHillshadeIgor: 'dsm-hillshade-igor',
} as const;

export type GeospatialDataCategory = (typeof GeospatialDataCategories)[keyof typeof GeospatialDataCategories];
