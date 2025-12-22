/**
 * Minimal Arma Reforger Engine for Map Viewer
 *
 * Provides core functionality for displaying interactive maps:
 * - Dynamically loads map configurations from all_arma_maps.json
 * - Coordinate conversion between Leaflet and game coordinates
 * - Height map data loading and elevation queries
 *
 * Dependencies: Leaflet.js, jQuery
 * @version 2.0
 */

// Detect mobile viewport for responsive map settings
var isMobile = window.innerWidth < 992;

/**
 * Main engine object containing all map configurations and utilities
 * @namespace
 */
var engine = {
  /**
   * Currently active map namespace (set dynamically)
   * @type {Object|boolean}
   */
  namespace: false,

  /**
   * Default map to load on initialization
   * @type {string}
   */
  namespace_default: "everon",

  /**
   * All available map namespace configurations
   * Loaded dynamically from all_arma_maps.json
   * @type {Object.<string, Object>}
   */
  namespaces: {},

  /**
   * Corner function templates for different map types
   * Referenced by corner_type in all_arma_maps.json
   */
  cornerFunctions: {
    corners_medium_padding: function(width, height) {
      return [
        L.latLng(isMobile ? -80 : -30, isMobile ? -80 : -30),
        L.latLng(width + 35, height + 35),
        L.latLng(0, 0),
        L.latLng(width, height),
      ];
    },
    
    corners_small_padding: function(width, height) {
      return [
        L.latLng(-60, -60),
        L.latLng(width + 32, height + 10),
        L.latLng(0, 0),
        L.latLng(width + 3, height + 3),
      ];
    },
    
    corners_large_padding: function(width, height) {
      return [
        L.latLng(isMobile ? -80 : -30, isMobile ? -80 : -30),
        L.latLng(width + 80, height + 80),
        L.latLng(0, 0),
        L.latLng(width, height),
      ];
    },
    
    corners_large_padding_adjusted: function(width, height) {
      return [
        L.latLng(isMobile ? -80 : -30, isMobile ? -80 : -30),
        L.latLng(width + 80, height + 80),
        L.latLng(0, 0),
        L.latLng(width - 3, height - 3),
      ];
    },
    
    corners_large_padding_half: function(width, height) {
      return [
        L.latLng(isMobile ? -80 : -30, isMobile ? -80 : -30),
        L.latLng(width + 80, height + 80),
        L.latLng(0, 0),
        L.latLng(width, height - 0.5),
      ];
    },
    
    corners_minimal_padding: function(width, height) {
      return [
        L.latLng(-60, -60),
        L.latLng(width + 1, height + 10),
        L.latLng(0, 0),
        L.latLng(width, height),
      ];
    },
    
    corners_seitenbuch: function(width, height) {
      return [
        L.latLng(-60, -60),           // [0] NW padding (for map view)
        L.latLng(width, height),      // [1] SE - REMOVED +1, +10
        L.latLng(0, 0),               // [2] Tile bounds start
        L.latLng(width, height),      // [3] Tile bounds end
      ];
    },
    
    corners_takistan: function(width, height) {
      return [
        L.latLng(isMobile ? -80 : -30, isMobile ? -80 : -30),
        L.latLng(width + 32, height + 32),
        L.latLng(0, 0),
        L.latLng(width + 34, height + 34),
      ];
    },
    
    corners_xlarge_padding: function(width, height) {
      return [
        L.latLng(isMobile ? -80 : -30, isMobile ? -80 : -30),
        L.latLng(width + 45, height + 45),
        L.latLng(0, 0),
        L.latLng(width, height),
      ];
    },
  },

  /**
   * Build namespace configuration from JSON map data
   * Creates the complete config object needed by Leaflet
   * 
   * @param {Object} mapData - Map data from all_arma_maps.json
   * @returns {Object} Complete namespace configuration
   */
  buildNamespaceConfig: function(mapData) {
    const config = {
      name: mapData.name,
      dir: mapData.dir,
      webp: mapData.webp || false,
      mod: mapData.coordinate_transform || {
        lng: { cof: 1, offset: 0 },
        lat: { cof: -1, offset: -256 }
      },
      marker_offset: 0,
      mod_marker: [1, 1],
      size: mapData.size,
      center_pos: [130, 125],
      CRS: L.extend({}, L.CRS.Simple, {
        transformation: new L.Transformation(1, 0, 1, 0),
      }),
      zoom: {
        min: isMobile ? 1 : 2,
        max: mapData.max_zoom,
        start: isMobile ? 1 : 2,
      },
      corner: this.cornerFunctions[mapData.corner_type] || this.cornerFunctions.corners_medium_padding,
      tileSize: mapData.tileSize || 256,
      height: mapData.resources && mapData.resources.height_data ? true : false,
      metadata: mapData.has_metadata || false,
    };

    // Add earth_correction flag if present
    if (mapData.earth_correction) {
      config.earth_corrent = true;
    }

    // Adjust center_pos for non-square maps
    const aspectRatio = mapData.size[0] / mapData.size[1];
    if (aspectRatio < 0.7) {
      config.center_pos = [65, 125];
    } else if (aspectRatio > 1.3) {
      config.center_pos = [125, 60];
    }

    return config;
  },

  /**
   * Load map configurations from all_arma_maps.json
   * Populates the namespaces object with satellite configurations
   * 
   * @async
   * @returns {Promise<void>}
   */
  loadMapConfigs: async function() {
    try {
      const response = await $.ajax({
        dataType: "json",
        url: "all_arma_maps.json",
        cache: true
      });

      response.forEach(mapData => {
        const namespace = mapData.namespace;
        const satelliteConfig = this.buildNamespaceConfig(mapData);
        
        this.namespaces[namespace] = {
          satellite: satelliteConfig
        };
      });

      console.log(`[engine] Loaded ${Object.keys(this.namespaces).length} map configurations`);
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('engineConfigsLoaded', { 
          detail: { count: Object.keys(this.namespaces).length } 
        }));
      }
      
      return this.namespaces;
    } catch (error) {
      console.error('[engine] Failed to load map configurations:', error);
      throw error;
    }
  },

  /**
   * Convert Leaflet map coordinates to Arma Reforger game coordinates
   *
   * Applies the active namespace's transformation coefficients and offsets.
   * Optionally applies earth curvature correction for satellite maps.
   *
   * @param {number} lng - Leaflet longitude (X coordinate)
   * @param {number} lat - Leaflet latitude (Y coordinate)
   * @param {boolean} [roundToInt=true] - Round to integers (0 decimals) or keep precision (6 decimals)
   * @param {boolean} [returnArray=false] - Return as array [lng, lat] or string "lng,lat"
   * @returns {Array<string>|string} Game coordinates as array or comma-separated string
   *
   * @example
   * // Returns "6400,6400"
   * engine.convertCoordinates(125, 125)
   *
   * @example
   * // Returns ["6400", "6400"]
   * engine.convertCoordinates(125, 125, true, true)
   */
  convertCoordinates: function (
    lng,
    lat,
    roundToInt = true,
    returnArray = false,
  ) {
    let lngCorrection = 0;
    let latCorrection = 0;

    lng =
      (lng + engine.namespace.mod.lng.offset) * engine.namespace.mod.lng.cof;
    lng1 = (lng * 10 * engine.namespace.mod.lng.cof) / 10;
    lat =
      (lat + engine.namespace.mod.lat.offset) * engine.namespace.mod.lat.cof;

    if (engine.namespace.earth_corrent ?? false) {
      lngCorrection = engine.namespace.size[0] / 2 - lng;
      latCorrection = engine.namespace.size[1] / 2 - lat;
      lngCorrection = (lngCorrection / engine.namespace.size[0]) * 100;
      latCorrection = (latCorrection / engine.namespace.size[1]) * 100;
      lng += lngCorrection;
      lat += latCorrection;
    }

    if (roundToInt) {
      lng = lng.toFixed(0);
      lat = lat.toFixed(0);
    } else {
      lng = lng.toFixed(6);
      lat = lat.toFixed(6);
    }

    return returnArray ? [lng, lat] : lng + "," + lat;
  },

  /**
   * Height map data and elevation query system
   * @namespace
   */
  height: {
    map: false,
    size: false,

    load: async function () {
      engine.height.map = false;
      engine.height.size = false;

      if (!engine.namespace.height) {
        return;
      }

      $.ajax({
        dataType: "json",
        url: "height_data/" + engine.namespace.name + "_height.json",
        cache: true,
        success: function (data) {
          engine.height.map = data;
          let cellWidth = engine.namespace.size[0] / engine.height.map.length;
          let cellHeight =
            engine.namespace.size[1] / engine.height.map[0].length;
          engine.height.size = [cellWidth, cellHeight];
          console.log('[engine] Height map loaded for', engine.namespace.name, 
                      '- Grid cells:', engine.height.map.length, 'x', engine.height.map[0].length);
        },
        error: function(xhr, status, error) {
          console.warn('[engine] Failed to load height map for', engine.namespace.name, ':', error);
        }
      });
    },

    get: function (x, y) {
      let elevation = 0;
      try {
        let xIndex = (x / engine.height.size[0]).toFixed(0);
        let yIndex = (
          engine.namespace.size[1] / engine.height.size[1] -
          y / engine.height.size[1]
        ).toFixed(0);
        elevation = engine.height.map[xIndex][yIndex] ?? 0;
      } catch (error) {}
      return elevation;
    },
  },

  getBounds: function (corner1, corner2) {
    const aspectRatio = parseFloat((window.innerWidth / window.innerHeight).toFixed(2));
    
    const c1 = L.latLng(corner1.lat, corner1.lng);
    const c2 = L.latLng(corner2.lat, corner2.lng);
    
    console.log('[getBounds] Aspect ratio:', aspectRatio);
    console.log('[getBounds] Input corners:', c1, c2);
    
    if (aspectRatio < 1) {
      c1.lat -= 70;
      c1.lng -= 80;
      c2.lat += 120;
      c2.lng += 80;
    } else if (aspectRatio < 2) {
      c1.lat -= 70;
      c1.lng -= 90;
      c2.lat += 70;
      c2.lng += 80;
    } else {
      console.log('[getBounds] Wide landscape - no padding applied');
    }
    
    console.log('[getBounds] Output corners:', c1, c2);
    return { corner1: c1, corner2: c2 };
  },
};

$(document).ready(function() {
  console.log('[engine] Initializing...');
  engine.loadMapConfigs().catch(err => {
    console.error('[engine] Failed to initialize:', err);
  });
});
