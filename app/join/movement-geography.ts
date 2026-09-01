/**
 * Geometry for the /join hero: the continental United States and a simple
 * river system, as longitude/latitude pairs.
 *
 * This is a visual metaphor, not a hydrology map. The silhouette is a clean
 * simplification of the lower 48, tracing the international border through the
 * Great Lakes the way a familiar silhouette does. The rivers are deliberately
 * few and deliberately simplified: the Mississippi rising in Minnesota and
 * running south to the Gulf, and a sparse set of tributaries reaching it from
 * different parts of the country. Many streams, one river.
 *
 * Nothing here is a location of anyone. The point field the engine lays over
 * this shape is symbolic and must not be read as placements.
 */
export type LonLat = [longitude: number, latitude: number];

/** The lower 48, clockwise from the north-west corner. */
export const unitedStates: LonLat[] = [
  [-124.7, 48.4],
  [-122.8, 49.0],
  [-117.0, 49.0],
  [-104.0, 49.0],
  [-97.2, 49.0],
  [-95.2, 49.4],
  [-94.7, 48.8],
  [-92.0, 48.4],
  [-89.5, 48.0],
  [-88.0, 48.3],
  [-86.5, 47.6],
  [-84.8, 46.9],
  [-84.1, 46.2],
  [-83.6, 45.8],
  [-82.5, 45.3],
  [-82.1, 43.6],
  [-82.4, 42.9],
  [-83.1, 42.3],
  [-82.6, 41.7],
  [-80.0, 42.4],
  [-79.0, 42.9],
  [-79.1, 43.3],
  [-78.0, 43.6],
  [-76.3, 44.1],
  [-75.0, 45.0],
  [-71.5, 45.0],
  [-70.0, 46.7],
  [-69.2, 47.4],
  [-67.8, 47.1],
  [-67.0, 45.2],
  [-66.9, 44.8],
  [-68.5, 44.3],
  [-70.2, 43.7],
  [-70.6, 42.9],
  [-70.0, 41.7],
  [-71.5, 41.4],
  [-73.9, 40.6],
  [-74.9, 38.9],
  [-75.5, 38.0],
  [-76.0, 37.0],
  [-75.5, 35.2],
  [-77.9, 33.9],
  [-79.9, 32.8],
  [-81.4, 30.4],
  [-80.6, 28.3],
  [-80.2, 25.8],
  [-81.0, 25.1],
  [-82.3, 26.9],
  [-82.7, 28.0],
  [-84.0, 30.0],
  [-85.4, 29.7],
  [-87.5, 30.4],
  [-89.4, 30.2],
  [-90.0, 29.2],
  [-91.5, 29.5],
  [-94.0, 29.7],
  [-96.5, 28.5],
  [-97.2, 27.8],
  [-97.2, 25.9],
  [-99.0, 26.4],
  [-100.0, 28.0],
  [-101.4, 29.7],
  [-103.0, 29.0],
  [-104.6, 29.6],
  [-106.5, 31.8],
  [-108.2, 31.3],
  [-111.1, 31.3],
  [-114.8, 32.5],
  [-117.1, 32.5],
  [-118.4, 33.8],
  [-120.6, 34.6],
  [-121.9, 36.6],
  [-122.5, 37.8],
  [-123.8, 39.5],
  [-124.4, 40.4],
  [-124.1, 42.0],
  [-124.5, 43.4],
  [-124.0, 44.7],
  [-123.9, 46.2],
];

export type Stream = {
  /** Drawn a little heavier than the rest. Only the Mississippi. */
  spine?: boolean;
  points: LonLat[];
};

/**
 * The Mississippi first, listed north to south so its direction is in the
 * data, then six tributaries. Each tributary ends where it meets a larger
 * river, so the picture reads as streams arriving rather than branches leaving.
 */
export const streams: Stream[] = [
  {
    spine: true,
    points: [
      [-95.2, 47.3],
      [-94.6, 46.4],
      [-93.3, 45.0],
      [-92.0, 44.2],
      [-91.2, 43.0],
      [-90.7, 41.6],
      [-90.5, 40.3],
      [-90.2, 38.7],
      [-89.5, 37.6],
      [-89.2, 37.0],
      [-89.8, 35.8],
      [-90.2, 34.8],
      [-91.0, 33.5],
      [-91.2, 32.3],
      [-91.2, 31.0],
      [-90.8, 30.2],
      [-89.9, 29.3],
    ],
  },
  /* Missouri, from the north-west. */
  {
    points: [
      [-111.5, 47.5],
      [-108.0, 47.9],
      [-104.0, 47.9],
      [-101.5, 47.2],
      [-100.6, 45.8],
      [-100.3, 44.2],
      [-98.5, 43.0],
      [-96.4, 42.4],
      [-95.8, 41.0],
      [-95.0, 39.8],
      [-93.5, 39.1],
      [-91.8, 38.9],
      [-90.3, 38.8],
    ],
  },
  /* Platte, joining the Missouri. */
  {
    points: [
      [-105.0, 41.1],
      [-102.0, 41.1],
      [-99.5, 40.9],
      [-97.0, 41.1],
      [-95.9, 41.0],
    ],
  },
  /* Ohio, from the east. */
  {
    points: [
      [-80.0, 40.4],
      [-81.5, 39.3],
      [-83.0, 38.7],
      [-84.6, 39.0],
      [-86.3, 37.9],
      [-87.6, 37.8],
      [-88.5, 37.2],
      [-89.2, 37.0],
    ],
  },
  /* Tennessee, joining the Ohio. */
  {
    points: [
      [-83.9, 35.9],
      [-85.8, 35.2],
      [-87.5, 34.7],
      [-88.1, 35.4],
      [-88.2, 36.6],
      [-88.6, 37.1],
    ],
  },
  /* Arkansas, from the west. */
  {
    points: [
      [-105.8, 38.5],
      [-102.5, 38.0],
      [-99.5, 37.9],
      [-97.4, 37.6],
      [-96.0, 36.1],
      [-94.4, 35.4],
      [-92.7, 34.8],
      [-91.4, 33.9],
      [-91.1, 33.5],
    ],
  },
  /* Red, from the south-west. */
  {
    points: [
      [-101.0, 34.5],
      [-98.0, 33.9],
      [-95.5, 33.8],
      [-93.7, 33.0],
      [-92.6, 31.9],
      [-91.4, 31.0],
    ],
  },
];
