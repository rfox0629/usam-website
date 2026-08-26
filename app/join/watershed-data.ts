/**
 * USA-191: the Mississippi watershed, as geography rather than as decoration.
 *
 * The founder direction is explicit that this should follow the real drainage
 * basin rather than invented branches, so every polyline below is a real river
 * traced through the places it actually runs. Coordinates are [longitude,
 * latitude] and are simplified to the handful of waypoints that carry a river's
 * recognisable shape at the size this is drawn.
 *
 * `attachTo` is what makes the picture mean something. Each tributary names the
 * river it empties into, and the renderer splices its course onto the rest of
 * its parent's course all the way to the Gulf. A drop of light entering the
 * Yellowstone in Wyoming therefore travels the Yellowstone, then the Missouri,
 * then the Mississippi, and leaves past New Orleans. Many streams, one river.
 */

export type River = {
  /** Name of the river this one empties into. Absent on the main stem. */
  attachTo?: string;
  name: string;
  /**
   * Strahler-ish rank, used only for line weight. 1 is a headwater stream, 4 is
   * the lower Mississippi.
   */
  order: number;
  points: [number, number][];
};

/**
 * The lower 48, traced coastline then border then the northern edge.
 *
 * Simplified hard: this is read at a few hundred pixels wide as a field of
 * dots, so what matters is that the silhouette is unmistakably the United
 * States, not that any one bay is correct.
 */
export const usOutline: [number, number][] = [
  // Pacific coast, north to south.
  [-124.7, 48.4],
  [-124.1, 46.9],
  [-123.9, 46.2],
  [-124.1, 43.7],
  [-124.4, 42.7],
  [-124.2, 41.8],
  [-124.1, 40.4],
  [-123.8, 39.4],
  [-122.9, 38.0],
  [-122.1, 36.9],
  [-121.9, 36.6],
  [-120.6, 34.6],
  [-119.2, 34.1],
  [-118.4, 33.7],
  [-117.3, 32.8],
  [-117.1, 32.53],
  // The southern border.
  [-114.7, 32.72],
  [-111.0, 31.33],
  [-108.2, 31.33],
  [-108.2, 31.78],
  [-106.5, 31.78],
  [-104.9, 30.6],
  [-103.1, 28.98],
  [-102.4, 29.78],
  [-101.4, 29.77],
  [-100.0, 28.2],
  [-99.1, 26.4],
  [-97.4, 25.87],
  // The Gulf, west to east.
  [-97.2, 26.9],
  [-97.0, 28.0],
  [-96.4, 28.5],
  [-95.1, 29.1],
  [-93.8, 29.7],
  [-92.1, 29.6],
  [-91.3, 29.2],
  [-89.4, 29.1],
  [-89.2, 30.2],
  [-88.0, 30.4],
  [-87.2, 30.4],
  [-86.2, 30.4],
  [-85.0, 29.7],
  [-84.0, 30.1],
  [-83.0, 29.2],
  [-82.8, 28.0],
  [-81.8, 26.0],
  [-81.1, 25.2],
  [-80.4, 25.2],
  // Florida's east side and the Atlantic, south to north.
  [-80.1, 26.7],
  [-80.6, 28.5],
  [-81.4, 30.3],
  [-80.9, 32.0],
  [-79.9, 32.8],
  [-78.0, 33.9],
  [-75.8, 35.2],
  [-76.3, 36.9],
  [-75.9, 37.9],
  [-75.0, 38.5],
  [-74.2, 39.5],
  [-74.0, 40.5],
  [-72.0, 41.3],
  [-70.6, 41.7],
  [-70.0, 42.0],
  [-70.8, 42.9],
  [-70.7, 43.6],
  [-69.0, 44.0],
  [-67.8, 44.8],
  [-67.0, 45.2],
  // The northern edge, east to west: Maine, the St Lawrence, the Lakes, the
  // 49th parallel.
  [-67.8, 47.1],
  [-69.2, 47.45],
  [-70.3, 46.0],
  [-71.5, 45.0],
  [-74.7, 45.0],
  [-76.9, 44.2],
  [-79.2, 43.45],
  [-78.9, 42.8],
  [-81.4, 42.3],
  [-83.1, 42.0],
  [-82.4, 43.0],
  [-82.5, 45.0],
  [-84.0, 45.9],
  [-84.6, 46.5],
  [-86.5, 46.5],
  [-88.4, 46.9],
  [-90.4, 46.6],
  [-92.1, 46.8],
  [-92.3, 48.2],
  [-95.2, 49.0],
  [-97.2, 49.0],
  [-104.0, 49.0],
  [-110.0, 49.0],
  [-116.0, 49.0],
  [-123.0, 49.0],
];

/**
 * Lake Michigan, cut out of the dot field.
 *
 * The only lake that needs to be a hole: the outline above runs along the south
 * shore of Erie and the Canadian side of Huron and Superior, so those fall
 * outside it already. Without this one, Michigan reads as a solid block and the
 * whole map stops looking like the United States.
 */
export const lakeMichigan: [number, number][] = [
  [-87.9, 41.62],
  [-86.3, 41.75],
  [-86.2, 42.9],
  [-86.0, 44.0],
  [-85.5, 45.2],
  [-85.6, 45.8],
  [-86.9, 45.9],
  [-87.6, 45.1],
  [-87.2, 44.5],
  [-87.7, 43.3],
  [-87.8, 42.4],
];

/**
 * The basin. Main stem first, then tributaries roughly west to east.
 *
 * Together these drain about 40 percent of the lower 48, which is the reason
 * the image works: the country really does gather into one river.
 */
export const rivers: River[] = [
  {
    name: "mississippi",
    order: 4,
    points: [
      [-95.2, 47.24], // Lake Itasca, Minnesota
      [-94.88, 47.47],
      [-94.2, 46.5],
      [-94.0, 45.55],
      [-93.53, 45.1],
      [-93.27, 44.97], // Minneapolis
      [-92.8, 44.75],
      [-91.9, 44.1],
      [-91.25, 43.8], // La Crosse
      [-91.15, 43.05], // Prairie du Chien
      [-90.66, 42.5], // Dubuque
      [-90.58, 41.52], // Davenport
      [-91.13, 40.8],
      [-91.4, 40.4], // Keokuk
      [-91.4, 39.93], // Quincy
      [-90.7, 38.97], // Grafton, the Illinois comes in
      [-90.2, 38.63], // St Louis
      [-89.95, 37.9],
      [-89.5, 37.3],
      [-89.17, 36.99], // Cairo, the Ohio comes in
      [-89.5, 36.3],
      [-90.05, 35.15], // Memphis
      [-90.9, 34.4],
      [-91.06, 33.4], // Greenville
      [-91.15, 32.8],
      [-90.9, 32.35], // Vicksburg
      [-91.38, 31.56], // Natchez
      [-91.5, 31.05], // the Red arrives
      [-91.19, 30.45], // Baton Rouge
      [-90.6, 30.05],
      [-90.07, 29.95], // New Orleans
      [-89.55, 29.5], // the Gulf
    ],
  },
  {
    attachTo: "mississippi",
    name: "missouri",
    order: 3,
    points: [
      [-111.52, 45.9], // Three Forks, Montana
      [-111.3, 47.5], // Great Falls
      [-109.8, 47.9],
      [-107.5, 48.1],
      [-104.5, 47.99],
      [-103.6, 48.05], // Williston
      [-101.8, 47.5],
      [-100.78, 46.81], // Bismarck
      [-100.3, 45.5],
      [-99.5, 44.4],
      [-97.5, 43.2],
      [-96.4, 42.5], // Sioux City
      [-95.93, 41.26], // Omaha
      [-95.6, 40.0],
      [-94.85, 39.35],
      [-94.58, 39.1], // Kansas City
      [-93.2, 38.9],
      [-92.17, 38.58], // Jefferson City
      [-91.0, 38.75],
      [-90.2, 38.75], // into the Mississippi above St Louis
    ],
  },
  {
    attachTo: "missouri",
    name: "yellowstone",
    order: 2,
    points: [
      [-110.4, 44.5],
      [-110.0, 45.3],
      [-108.5, 45.78], // Billings
      [-106.6, 46.4],
      [-105.0, 47.0],
      [-104.2, 47.6],
    ],
  },
  {
    attachTo: "missouri",
    name: "platte",
    order: 2,
    points: [
      [-104.7, 41.1],
      [-102.6, 41.12],
      [-100.77, 41.12], // North Platte
      [-98.34, 40.92], // Grand Island
      [-96.9, 41.0],
      [-95.88, 41.05], // Plattsmouth
    ],
  },
  {
    attachTo: "missouri",
    name: "kansas",
    order: 2,
    points: [
      [-100.9, 39.35],
      [-98.6, 39.05],
      [-96.57, 39.19], // Manhattan
      [-95.6, 39.06],
      [-94.6, 39.11], // Kansas City
    ],
  },
  {
    attachTo: "missouri",
    name: "osage",
    order: 1,
    points: [
      [-94.6, 38.15],
      [-93.6, 38.15],
      [-92.9, 38.2],
      [-92.17, 38.5],
    ],
  },
  {
    attachTo: "mississippi",
    name: "minnesota",
    order: 1,
    points: [
      [-96.55, 45.3], // Big Stone Lake
      [-95.6, 44.7],
      [-94.0, 44.16], // Mankato
      [-93.6, 44.7],
      [-93.3, 44.9],
    ],
  },
  {
    attachTo: "mississippi",
    name: "stCroix",
    order: 1,
    points: [
      [-92.35, 46.0],
      [-92.6, 45.4],
      [-92.75, 44.75],
    ],
  },
  {
    attachTo: "mississippi",
    name: "wisconsin",
    order: 1,
    points: [
      [-89.7, 45.8],
      [-89.8, 44.6],
      [-90.5, 43.4],
      [-91.15, 43.05],
    ],
  },
  {
    attachTo: "mississippi",
    name: "desMoines",
    order: 1,
    points: [
      [-95.0, 43.5],
      [-94.2, 42.5],
      [-93.6, 41.6], // Des Moines
      [-92.4, 41.0],
      [-91.4, 40.4], // Keokuk
    ],
  },
  {
    attachTo: "mississippi",
    name: "illinois",
    order: 2,
    points: [
      [-88.1, 41.6],
      [-88.6, 41.35],
      [-89.1, 41.2],
      [-89.6, 40.7], // Peoria
      [-90.4, 40.0], // Beardstown
      [-90.55, 39.4],
      [-90.7, 38.97], // Grafton
    ],
  },
  {
    attachTo: "mississippi",
    name: "ohio",
    order: 3,
    points: [
      [-79.98, 40.44], // Pittsburgh
      [-80.7, 40.07], // Wheeling
      [-81.6, 39.4],
      [-82.6, 38.6],
      [-83.8, 38.75],
      [-84.51, 39.1], // Cincinnati
      [-85.75, 38.28], // Louisville
      [-86.8, 37.9],
      [-87.57, 37.97], // Evansville
      [-88.4, 37.2],
      [-88.6, 37.08], // Paducah
      [-89.17, 36.99], // Cairo
    ],
  },
  {
    attachTo: "ohio",
    name: "wabash",
    order: 1,
    points: [
      [-85.0, 40.75],
      [-86.0, 40.6],
      [-87.4, 39.47], // Terre Haute
      [-87.7, 38.6],
      [-87.9, 37.9],
    ],
  },
  {
    attachTo: "ohio",
    name: "tennessee",
    order: 2,
    points: [
      [-83.92, 35.96], // Knoxville
      [-85.31, 35.05], // Chattanooga
      [-86.6, 34.73], // Huntsville
      [-87.67, 34.8], // Florence
      [-88.15, 35.6],
      [-88.3, 36.5],
      [-88.6, 37.05], // Paducah
    ],
  },
  {
    attachTo: "ohio",
    name: "cumberland",
    order: 1,
    points: [
      [-84.5, 36.6],
      [-85.5, 36.3],
      [-86.78, 36.16], // Nashville
      [-87.36, 36.53], // Clarksville
      [-88.1, 37.0],
      [-88.42, 37.15], // Smithland
    ],
  },
  {
    attachTo: "mississippi",
    name: "arkansas",
    order: 3,
    points: [
      [-106.3, 39.25], // Leadville, Colorado
      [-105.2, 38.45],
      [-104.6, 38.27], // Pueblo
      [-102.3, 38.05],
      [-100.02, 37.75], // Dodge City
      [-97.34, 37.69], // Wichita
      [-96.4, 36.7],
      [-95.94, 36.15], // Tulsa
      [-95.37, 35.75], // Muskogee, the Neosho arrives
      [-94.4, 35.4], // Fort Smith
      [-93.1, 35.0],
      [-92.29, 34.75], // Little Rock
      [-91.5, 34.3],
      [-91.06, 33.95],
    ],
  },
  {
    attachTo: "arkansas",
    name: "canadian",
    order: 1,
    points: [
      [-104.6, 35.6],
      [-102.0, 35.4],
      [-99.5, 35.35],
      [-97.5, 35.2],
      [-95.5, 35.4],
    ],
  },
  {
    attachTo: "mississippi",
    name: "white",
    order: 1,
    points: [
      [-93.6, 36.15],
      [-92.5, 36.25],
      [-91.64, 35.77], // Batesville
      [-91.3, 34.9],
      [-91.1, 34.0],
    ],
  },
  {
    attachTo: "mississippi",
    name: "red",
    order: 3,
    points: [
      [-101.8, 34.9],
      [-100.0, 34.5],
      [-98.5, 34.0], // Wichita Falls
      [-96.5, 33.85],
      [-94.7, 33.6],
      [-94.04, 33.4], // Texarkana
      [-93.75, 32.51], // Shreveport
      [-92.9, 31.6],
      [-92.4, 31.3], // Alexandria
      [-91.8, 31.1],
      [-91.5, 31.05],
    ],
  },
  {
    attachTo: "red",
    name: "ouachita",
    order: 1,
    points: [
      [-93.9, 34.6],
      [-92.8, 33.6],
      [-92.11, 32.51], // Monroe
      [-91.8, 31.7],
      [-91.8, 31.1],
    ],
  },
  {
    attachTo: "mississippi",
    name: "yazoo",
    order: 1,
    points: [
      [-90.3, 33.9],
      [-90.5, 33.2],
      [-90.9, 32.35], // Vicksburg
    ],
  },
  {
    attachTo: "missouri",
    name: "milk",
    order: 1,
    points: [
      [-111.0, 48.7],
      [-108.5, 48.62],
      [-106.8, 48.1],
    ],
  },
  {
    attachTo: "missouri",
    name: "littleMissouri",
    order: 1,
    points: [
      [-104.6, 45.0],
      [-103.9, 46.2],
      [-103.3, 47.1],
      [-102.6, 47.6],
    ],
  },
  {
    attachTo: "missouri",
    name: "cheyenne",
    order: 1,
    points: [
      [-104.2, 43.6],
      [-102.4, 44.2],
      [-100.6, 44.65],
    ],
  },
  {
    attachTo: "missouri",
    name: "niobrara",
    order: 1,
    points: [
      [-102.6, 42.85],
      [-100.4, 42.78],
      [-98.1, 42.76],
    ],
  },
  {
    attachTo: "missouri",
    name: "james",
    order: 1,
    points: [
      [-98.5, 46.1],
      [-98.35, 45.0],
      [-98.2, 44.0],
      [-97.4, 43.05],
    ],
  },
  {
    attachTo: "missouri",
    name: "bigSioux",
    order: 1,
    points: [
      [-96.9, 44.6],
      [-96.7, 43.55],
      [-96.4, 42.5],
    ],
  },
  {
    attachTo: "kansas",
    name: "republican",
    order: 1,
    points: [
      [-101.6, 40.1],
      [-99.3, 40.05],
      [-97.6, 39.85],
      [-96.9, 39.4],
    ],
  },
  {
    attachTo: "kansas",
    name: "smokyHill",
    order: 1,
    points: [
      [-101.2, 38.75],
      [-98.8, 38.8],
      [-97.6, 38.9],
      [-96.9, 39.15],
    ],
  },
  {
    attachTo: "arkansas",
    name: "cimarron",
    order: 1,
    points: [
      [-104.0, 36.9],
      [-101.0, 36.95],
      [-98.4, 36.4],
      [-96.4, 36.65],
    ],
  },
  {
    attachTo: "arkansas",
    name: "neosho",
    order: 1,
    points: [
      [-96.3, 38.4],
      [-95.4, 37.0],
      [-95.1, 36.1],
      [-95.37, 35.75],
    ],
  },
  {
    attachTo: "red",
    name: "washita",
    order: 1,
    points: [
      [-99.5, 35.35],
      [-98.0, 34.85],
      [-96.55, 34.2],
      [-96.5, 33.85],
    ],
  },
  {
    attachTo: "mississippi",
    name: "chippewa",
    order: 1,
    points: [
      [-91.0, 45.55],
      [-91.5, 44.85],
      [-91.95, 44.35],
      [-91.9, 44.1],
    ],
  },
  {
    attachTo: "mississippi",
    name: "rock",
    order: 1,
    points: [
      [-89.0, 43.45],
      [-89.6, 42.5],
      [-90.3, 41.6],
      [-90.58, 41.52],
    ],
  },
  {
    attachTo: "mississippi",
    name: "iowaCedar",
    order: 1,
    points: [
      [-92.5, 42.6],
      [-91.9, 41.9],
      [-91.4, 41.35],
      [-91.13, 40.9],
    ],
  },
  {
    attachTo: "mississippi",
    name: "kaskaskia",
    order: 1,
    points: [
      [-88.5, 40.1],
      [-89.1, 39.2],
      [-89.7, 38.3],
      [-89.95, 37.95],
    ],
  },
  {
    attachTo: "mississippi",
    name: "bigBlack",
    order: 1,
    points: [
      [-89.9, 33.45],
      [-90.35, 32.8],
      [-90.9, 32.4],
    ],
  },
  {
    attachTo: "ohio",
    name: "allegheny",
    order: 1,
    points: [
      [-78.8, 41.9],
      [-79.4, 41.4],
      [-79.7, 40.9],
      [-79.98, 40.44],
    ],
  },
  {
    attachTo: "ohio",
    name: "monongahela",
    order: 1,
    points: [
      [-79.95, 39.5],
      [-79.85, 40.0],
      [-79.98, 40.42],
    ],
  },
  {
    attachTo: "ohio",
    name: "kanawha",
    order: 1,
    points: [
      [-80.9, 37.8],
      [-81.3, 38.2],
      [-81.7, 38.45],
      [-82.15, 38.72],
    ],
  },
  {
    attachTo: "ohio",
    name: "scioto",
    order: 1,
    points: [
      [-83.1, 40.3],
      [-83.05, 39.5],
      [-82.98, 38.75],
    ],
  },
  {
    attachTo: "ohio",
    name: "greatMiami",
    order: 1,
    points: [
      [-84.2, 40.3],
      [-84.5, 39.7],
      [-84.82, 39.12],
    ],
  },
  {
    attachTo: "ohio",
    name: "greenKentucky",
    order: 1,
    points: [
      [-85.5, 37.35],
      [-86.5, 37.2],
      [-87.3, 37.6],
      [-87.62, 37.9],
    ],
  },
];
