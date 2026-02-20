/**
 * E2E Test Data Fixtures
 * Test data objects for E2E tests including weapons, coordinates, and expected results
 */

export const WEAPONS = {
  '2B14': {
    name: 'Soviet 82mm mortar',
    shellTypes: ['HE']
  },
  'M252': {
    name: 'US 81mm mortar',
    shellTypes: ['HE']
  },
  'BM21': {
    name: 'BM-21 Grad MLRS',
    projectileTypes: ['HE']
  },
  'TYPE63': {
    name: 'Type-63 MLRS',
    projectileTypes: ['HE']
  },
  'D30': {
    name: 'Soviet D-30 122mm howitzer',
    projectileTypes: ['HE']
  },
  'M119': {
    name: 'US M119 105mm howitzer',
    projectileTypes: ['HE']
  }
};

export const VALID_COORDS = {
  mortar_short: {
    gun: {
      gridX: '064',
      gridY: '064',
      z: 125
    },
    target: {
      gridX: '076',
      gridY: '063',
      z: 80
    }
  },
  mortar_4digit: {
    gun: {
      gridX: '0640',
      gridY: '0640',
      z: 125
    },
    target: {
      gridX: '0765',
      gridY: '0635',
      z: 80
    }
  },
  mlrs_long: {
    gun: {
      x: 1000,
      y: 1000,
      z: 50
    },
    target: {
      x: 9000,
      y: 5000,
      z: 45
    }
  },
  howitzer_medium: {
    gun: {
      gridX: '050',
      gridY: '050',
      z: 100
    },
    target: {
      gridX: '080',
      gridY: '080',
      z: 90
    }
  }
};

export const INVALID_COORDS = {
  letters: {
    gridX: 'abc',
    gridY: '123'
  },
  outOfRange: {
    gridX: '999',
    gridY: '999'
  },
  empty: {
    gridX: '',
    gridY: ''
  }
};

export const EXPECTED_RESULTS = {
  mortar_short_2B14: {
    inRange: true,
    chargeRange: [1, 3],
    elevationMin: 800,
    elevationMax: 1400
  },
  mlrs_long_BM21: {
    inRange: true,
    // MLRS elevation varies by distance and rocket type - widen range to accommodate
    elevationMin: 200,
    elevationMax: 800
  }
};

export const FFE_PATTERNS = [
  'perpendicular',
  'along-bearing',
  'circular'
];

export const CORRECTION_VALUES = [
  { lr: 50, ad: 0 },
  { lr: -25, ad: 100 },
  { lr: 0, ad: -50 }
];
