
(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/Utility.js',["d3"], factory);
    } else {
        root.map_Utility = factory(root.d3);
    }
}(this, function (d3) {
    // Origonally ased on geohash.js
    // Geohash library for Javascript
    // (c) 2008 David Troy
    // Distributed under the MIT License

    function Geohash() {
    }
    Geohash.prototype.constructor = Geohash;
    Geohash.prototype._class += " map_Geohash";

    /* (Geohash-specific) Base32 map */
    Geohash.prototype.base32 = "0123456789bcdefghjkmnpqrstuvwxyz";

    /**
     * Encodes latitude/longitude to geohash, either to specified precision or to automatically
     * evaluated precision.
     *
     * @param   {number} lat - Latitude in degrees.
     * @param   {number} lon - Longitude in degrees.
     * @param   {number} [precision] - Number of characters in resulting geohash.
     * @returns {string} Geohash of supplied latitude/longitude.
     * @throws  Invalid geohash.
     *
     * @example
     *     var geohash = Geohash.encode(52.205, 0.119, 7); // geohash: "u120fxw"
     */
    Geohash.prototype.encode = function (lat, lon, precision) {
        // infer precision?
        if (typeof precision === "undefined") {
            // refine geohash until it matches precision of supplied lat/lon
            for (var p = 1; p <= 12; p++) {
                var hash = this.encode(lat, lon, p);
                var posn = this.decode(hash);
                if (posn.lat === lat && posn.lon === lon) return hash;
            }
            precision = 12; // set to maximum
        }

        lat = Number(lat);
        lon = Number(lon);
        precision = Number(precision);

        if (isNaN(lat) || isNaN(lon) || isNaN(precision)) throw new Error("Invalid geohash");

        var idx = 0; // index into base32 map
        var bit = 0; // each char holds 5 bits
        var evenBit = true;
        var geohash = "";

        var latMin = -90, latMax = 90;
        var lonMin = -180, lonMax = 180;

        while (geohash.length < precision) {
            if (evenBit) {
                // bisect E-W longitude
                var lonMid = (lonMin + lonMax) / 2;
                if (lon > lonMid) {
                    idx = idx * 2 + 1;
                    lonMin = lonMid;
                } else {
                    idx = idx * 2;
                    lonMax = lonMid;
                }
            } else {
                // bisect N-S latitude
                var latMid = (latMin + latMax) / 2;
                if (lat > latMid) {
                    idx = idx * 2 + 1;
                    latMin = latMid;
                } else {
                    idx = idx * 2;
                    latMax = latMid;
                }
            }
            evenBit = !evenBit;

            if (++bit === 5) {
                // 5 bits gives us a character: append it and start over
                geohash += this.base32.charAt(idx);
                bit = 0;
                idx = 0;
            }
        }

        return geohash;
    };

    /**
     * Decode geohash to latitude/longitude (location is approximate centre of geohash cell,
     *     to reasonable precision).
     *
     * @param   {string} geohash - Geohash string to be converted to latitude/longitude.
     * @returns {{lat:number, lon:number}} (Center of) geohashed location.
     * @throws  Invalid geohash.
     *
     * @example
     *     var latlon = Geohash.decode("u120fxw"); // latlon: { lat: 52.205, lon: 0.1188 }
     */
    Geohash.prototype.decode = function (geohash) {

        var bounds = this.bounds(geohash); // <-- the hard work
        // now just determine the centre of the cell...

        var latMin = bounds.sw.lat, lonMin = bounds.sw.lon;
        var latMax = bounds.ne.lat, lonMax = bounds.ne.lon;

        // cell centre
        var lat = (latMin + latMax) / 2;
        var lon = (lonMin + lonMax) / 2;

        // round to close to centre without excessive precision: ⌊2-log10(Δ°)⌋ decimal places
        lat = lat.toFixed(Math.floor(2 - Math.log(latMax - latMin) / Math.LN10));
        lon = lon.toFixed(Math.floor(2 - Math.log(lonMax - lonMin) / Math.LN10));

        return { lat: Number(lat), lon: Number(lon) };
    };

    /**
     * Returns SW/NE latitude/longitude bounds of specified geohash.
     *
     * @param   {string} geohash - Cell that bounds are required of.
     * @returns {{sw: {lat: number, lon: number}, ne: {lat: number, lon: number}}}
     * @throws  Invalid geohash.
     */
    Geohash.prototype.bounds = function (geohash) {
        if (geohash.length === 0) throw new Error("Invalid geohash");

        geohash = geohash.toLowerCase();

        var evenBit = true;
        var latMin = -90, latMax = 90;
        var lonMin = -180, lonMax = 180;

        for (var i = 0; i < geohash.length; i++) {
            var chr = geohash.charAt(i);
            var idx = this.base32.indexOf(chr);
            if (idx === -1) throw new Error("Invalid geohash");

            for (var n = 4; n >= 0; n--) {
                var bitN = idx >> n & 1;
                if (evenBit) {
                    // longitude
                    var lonMid = (lonMin + lonMax) / 2;
                    if (bitN === 1) {
                        lonMin = lonMid;
                    } else {
                        lonMax = lonMid;
                    }
                } else {
                    // latitude
                    var latMid = (latMin + latMax) / 2;
                    if (bitN === 1) {
                        latMin = latMid;
                    } else {
                        latMax = latMid;
                    }
                }
                evenBit = !evenBit;
            }
        }

        var bounds = {
            sw: { lat: latMin, lon: lonMin },
            ne: { lat: latMax, lon: lonMax }
        };

        return bounds;
    };

    /**
     * Determines adjacent cell in given direction.
     *
     * @param   geohash - Cell to which adjacent cell is required.
     * @param   direction - Direction from geohash (N/S/E/W).
     * @returns {string} Geocode of adjacent cell.
     * @throws  Invalid geohash.
     */
    Geohash.prototype.adjacent = function (geohash, direction) {
        // based on github.com/davetroy/geohash-js

        geohash = geohash.toLowerCase();
        direction = direction.toLowerCase();

        if (geohash.length === 0) throw new Error("Invalid geohash");
        if ("nsew".indexOf(direction) === -1) throw new Error("Invalid direction");

        var neighbour = {
            n: ["p0r21436x8zb9dcf5h7kjnmqesgutwvy", "bc01fg45238967deuvhjyznpkmstqrwx"],
            s: ["14365h7k9dcfesgujnmqp0r2twvyx8zb", "238967debc01fg45kmstqrwxuvhjyznp"],
            e: ["bc01fg45238967deuvhjyznpkmstqrwx", "p0r21436x8zb9dcf5h7kjnmqesgutwvy"],
            w: ["238967debc01fg45kmstqrwxuvhjyznp", "14365h7k9dcfesgujnmqp0r2twvyx8zb"]
        };
        var border = {
            n: ["prxz", "bcfguvyz"],
            s: ["028b", "0145hjnp"],
            e: ["bcfguvyz", "prxz"],
            w: ["0145hjnp", "028b"]
        };

        var lastCh = geohash.slice(-1);    // last character of hash
        var parent = geohash.slice(0, -1); // hash without last character

        var type = geohash.length % 2;

        // check for edge-cases which don"t share common prefix
        if (border[direction][type].indexOf(lastCh) !== -1 && parent !== "") {
            parent = this.adjacent(parent, direction);
        }

        // append letter for direction to parent
        return parent + this.base32.charAt(neighbour[direction][type].indexOf(lastCh));
    };

    /**
     * Returns all 8 adjacent cells to specified geohash.
     *
     * @param   {string} geohash - Geohash neighbours are required of.
     * @returns {{n,ne,e,se,s,sw,w,nw: string}}
     * @throws  Invalid geohash.
     */
    Geohash.prototype.neighbours = function (geohash) {
        return {
            "n": this.adjacent(geohash, "n"),
            "ne": this.adjacent(this.adjacent(geohash, "n"), "e"),
            "e": this.adjacent(geohash, "e"),
            "se": this.adjacent(this.adjacent(geohash, "s"), "e"),
            "s": this.adjacent(geohash, "s"),
            "sw": this.adjacent(this.adjacent(geohash, "s"), "w"),
            "w": this.adjacent(geohash, "w"),
            "nw": this.adjacent(this.adjacent(geohash, "n"), "w")
        };
    };

    //  HPCC Extensions  ---
    Geohash.prototype.contained = function (w, n, e, s, precision) {
        if (isNaN(n) || n >= 90) n = 89;
        if (isNaN(e) || e > 180) e = 180;
        if (isNaN(s) || s <= -90) s = -89;
        if (isNaN(w) || w < -180) w = -180;
        precision = precision || 1;
        var geoHashNW = this.encode(n, w, precision);
        var geoHashNE = this.encode(n, e, precision);
        var geoHashSE = this.encode(s, e, precision);
        var currRowHash = geoHashNW;
        var col = 0, maxCol = -1;
        var geoHashes = [geoHashNW, geoHashSE];
        var currHash = this.adjacent(geoHashNW, "e");
        while (currHash !== geoHashSE) {
            geoHashes.push(currHash);
            ++col;
            if (currHash === geoHashNE || maxCol === col) {
                maxCol = col + 1;
                col = 0;
                currHash = this.adjacent(currRowHash, "s");
                currRowHash = currHash;
            } else {
                currHash = this.adjacent(currHash, "e");
            }
        }
        return geoHashes;
    };

    Geohash.prototype.calculateWidthDegrees = function (n) {
        var a;
        if (n % 2 === 0)
            a = -1;
        else
            a = -0.5;
        var result = 180 / Math.pow(2, 2.5 * n + a);
        return result;
    };

    Geohash.prototype.width = function (n) {
        var parity = n % 2;
        return 180 / (2 ^ (((5 * n + parity) / 2) - 1));
    };

    var Tile = function () {
        var size = [960, 500],
            scale = 256,
            translate = [size[0] / 2, size[1] / 2],
            zoomDelta = 0;

        function tile() {
            var z = Math.max(Math.log(scale) / Math.LN2 - 8, 0),
                z0 = Math.round(z + zoomDelta),
                k = Math.pow(2, z - z0 + 8),
                origin = [(translate[0] - scale / 2) / k, (translate[1] - scale / 2) / k],
                tiles = [],
                cols = d3.range(Math.max(0, Math.floor(-origin[0])), Math.max(0, Math.ceil(size[0] / k - origin[0]))),
                rows = d3.range(Math.max(0, Math.floor(-origin[1])), Math.max(0, Math.ceil(size[1] / k - origin[1])));

            rows.forEach(function (y) {
                cols.forEach(function (x) {
                    tiles.push([x, y, z0]);
                });
            });

            tiles.translate = origin;
            tiles.scale = k;

            return tiles;
        }

        tile.size = function (_) {
            if (!arguments.length) return size;
            size = _;
            return tile;
        };

        tile.scale = function (_) {
            if (!arguments.length) return scale;
            scale = _;
            return tile;
        };

        tile.translate = function (_) {
            if (!arguments.length) return translate;
            translate = _;
            return tile;
        };

        tile.zoomDelta = function (_) {
            if (!arguments.length) return zoomDelta;
            zoomDelta = +_;
            return tile;
        };

        return tile;
    };

    // A modified d3.geo.albersUsa to include Puerto Rico.
    var albersUsaPr = function () {
        var ε = 1e-6;

        var lower48 = d3.geo.albers();

        // EPSG:3338
        var alaska = d3.geo.conicEqualArea()
            .rotate([154, 0])
            .center([-2, 58.5])
            .parallels([55, 65]);

        // ESRI:102007
        var hawaii = d3.geo.conicEqualArea()
            .rotate([157, 0])
            .center([-3, 19.9])
            .parallels([8, 18]);

        // XXX? You should check that this is a standard PR projection!
        var puertoRico = d3.geo.conicEqualArea()
            .rotate([66, 0])
            .center([0, 18])
            .parallels([8, 18]);

        var point,
            pointStream = { point: function (x, y) { point = [x, y]; } },
            lower48Point,
            alaskaPoint,
            hawaiiPoint,
            puertoRicoPoint;

        function albersUsa(coordinates) {
            var x = coordinates[0], y = coordinates[1];
            point = null;
            (lower48Point(x, y), point) ||
            (alaskaPoint(x, y), point) ||
            (hawaiiPoint(x, y), point) ||
            (puertoRicoPoint(x, y), point); // jshint ignore:line
            return point;
        }

        albersUsa.invert = function (coordinates) {
            var k = lower48.scale(),
                t = lower48.translate(),
                x = (coordinates[0] - t[0]) / k,
                y = (coordinates[1] - t[1]) / k;
            return (y >= 0.120 && y < 0.234 && x >= -0.425 && x < -0.214 ? alaska
                : y >= 0.166 && y < 0.234 && x >= -0.214 && x < -0.115 ? hawaii
                : y >= 0.204 && y < 0.234 && x >= 0.320 && x < 0.380 ? puertoRico
                : lower48).invert(coordinates);
        };

        // A naïve multi-projection stream.
        // The projections must have mutually exclusive clip regions on the sphere,
        // as this will avoid emitting interleaving lines and polygons.
        albersUsa.stream = function (stream) {
            var lower48Stream = lower48.stream(stream),
                alaskaStream = alaska.stream(stream),
                hawaiiStream = hawaii.stream(stream),
                puertoRicoStream = puertoRico.stream(stream);
            return {
                point: function (x, y) {
                    lower48Stream.point(x, y);
                    alaskaStream.point(x, y);
                    hawaiiStream.point(x, y);
                    puertoRicoStream.point(x, y);
                },
                sphere: function () {
                    lower48Stream.sphere();
                    alaskaStream.sphere();
                    hawaiiStream.sphere();
                    puertoRicoStream.sphere();
                },
                lineStart: function () {
                    lower48Stream.lineStart();
                    alaskaStream.lineStart();
                    hawaiiStream.lineStart();
                    puertoRicoStream.lineStart();
                },
                lineEnd: function () {
                    lower48Stream.lineEnd();
                    alaskaStream.lineEnd();
                    hawaiiStream.lineEnd();
                    puertoRicoStream.lineEnd();
                },
                polygonStart: function () {
                    lower48Stream.polygonStart();
                    alaskaStream.polygonStart();
                    hawaiiStream.polygonStart();
                    puertoRicoStream.polygonStart();
                },
                polygonEnd: function () {
                    lower48Stream.polygonEnd();
                    alaskaStream.polygonEnd();
                    hawaiiStream.polygonEnd();
                    puertoRicoStream.polygonEnd();
                }
            };
        };

        albersUsa.precision = function (_) {
            if (!arguments.length) return lower48.precision();
            lower48.precision(_);
            alaska.precision(_);
            hawaii.precision(_);
            puertoRico.precision(_);
            return albersUsa;
        };

        albersUsa.scale = function (_) {
            if (!arguments.length) return lower48.scale();
            lower48.scale(_);
            alaska.scale(_ * 0.35);
            hawaii.scale(_);
            puertoRico.scale(_);
            return albersUsa.translate(lower48.translate());
        };

        albersUsa.translate = function (_) {
            if (!arguments.length) return lower48.translate();
            var k = lower48.scale(), x = +_[0], y = +_[1];

            lower48Point = lower48
                .translate(_)
                .clipExtent([[x - 0.455 * k, y - 0.238 * k], [x + 0.455 * k, y + 0.238 * k]])
                .stream(pointStream).point;

            alaskaPoint = alaska
                .translate([x - 0.307 * k, y + 0.201 * k])
                .clipExtent([[x - 0.425 * k + ε, y + 0.120 * k + ε], [x - 0.214 * k - ε, y + 0.234 * k - ε]])
                .stream(pointStream).point;

            hawaiiPoint = hawaii
                .translate([x - 0.205 * k, y + 0.212 * k])
                .clipExtent([[x - 0.214 * k + ε, y + 0.166 * k + ε], [x - 0.115 * k - ε, y + 0.234 * k - ε]])
                .stream(pointStream).point;

            puertoRicoPoint = puertoRico
                .translate([x + 0.350 * k, y + 0.224 * k])
                .clipExtent([[x + 0.320 * k, y + 0.204 * k], [x + 0.380 * k, y + 0.234 * k]])
                .stream(pointStream).point;

            return albersUsa;
        };

        return albersUsa.scale(1070);
    };

    if (!d3.geo.albersUsaPr) {
        d3.geo.albersUsaPr = albersUsaPr;
    }

    return {
        Geohash: Geohash,
        Tile: Tile,
        albersUsaPr: albersUsaPr
    };
}));

if (typeof define === "function" && define.amd) {
  define('css',[], function () { 
    return {
      load: function ($1, $2, load) { load() }
    } 
  })
};


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/Layered.js',["d3", "topojson", "../common/SVGWidget", "./Utility", "css!./Layered"], factory);
    } else {
        root.map_Layered = factory(root.d3, root.topojson, root.common_SVGWidget, root.map_Utility);
    }
}(this, function (d3, topojson, SVGWidget, Utility) {
    var zoomFactor = 1 / 4;
    var projectionFactor = (1 << 12) / 2 / Math.PI;

    function Layered() {
        SVGWidget.call(this);

        this._drawStartPos = "origin";
        this.projection("mercator");
    }
    Layered.prototype = Object.create(SVGWidget.prototype);
    Layered.prototype.constructor = Layered;
    Layered.prototype._class += " map_Layered";

    Layered.prototype.publish("projection", null, "set", "Map projection type", ["albersUsa", "albersUsaPr", "azimuthalEqualArea", "azimuthalEquidistant", "conicEqualArea", "conicConformal", "conicEquidistant", "equirectangular", "gnomonic", "mercator", "orthographic", "stereographic", "transverseMercator"]);
    Layered.prototype.publish("centerLat", 0, "number", "Center Latitude", null, { tags: ["Basic"] });
    Layered.prototype.publish("centerLong", 0, "number", "Center Longtitude", null, { tags: ["Basic"] });
    Layered.prototype.publish("zoom", 1, "number", "Zoom Level", null, { tags: ["Basic"] });
    Layered.prototype.publish("autoScaleMode", "all", "set", "Auto Scale", ["none", "all"], { tags: ["Basic"] });
    Layered.prototype.publish("layers", [], "widgetArray", "Layers");

    Layered.prototype.data = function (_) {
        var retVal = SVGWidget.prototype.data.apply(this, arguments);
        if (arguments.length) {
            this._autoScaleOnNextRender = true;
        }
        return retVal;
    };

    Layered.prototype.projection_orig = Layered.prototype.projection;
    Layered.prototype.projection = function (_) {
        var retVal = Layered.prototype.projection_orig.apply(this, arguments);
        if (arguments.length) {
            this._d3GeoProjection = d3.geo[_]()
                .scale(projectionFactor)
                .translate([0, 0])
            ;
            switch (_) {
                case "orthographic":
                    this._d3GeoProjection
                        .clipAngle(90)
                        .rotate([0, 0])
                    ;
            }
            this._d3GeoPath = d3.geo.path()
                .projection(this._d3GeoProjection)
            ;
            this._autoScaleOnNextRender = true;
        }
        return retVal;
    };

    Layered.prototype.size = function (_) {
        var retVal = SVGWidget.prototype.size.apply(this, arguments);
        if (arguments.length) {
            delete this._prevCenterLat;
            delete this._prevCenterLong;
        }
        return retVal;
    };

    Layered.prototype.enter = function (domNode, element) {
        SVGWidget.prototype.enter.apply(this, arguments);

        var context = this;
        this._zoom = d3.behavior.zoom()
            .scaleExtent([0.25 * zoomFactor, 131072 * zoomFactor])
            .on("zoomstart", function (ev) {
                context._zoomstart_translate = context._zoom.translate();
                context._zoomstart_scale = context._zoom.scale();
            })
            .on("zoom", function () {
                if (d3.event && d3.event.sourceEvent && d3.event.sourceEvent.ctrlKey && d3.event.sourceEvent.type === "mousemove") {
                    context.render();
                    return;
                }
                context.zoomed();

                var x = context.width() / 2;
                var y = context.height() / 2;
                var mapCenterLongLat = context.invert(x, y);
                context.centerLong(mapCenterLongLat[0]);
                context.centerLat(mapCenterLongLat[1]);
                context.zoom(context._zoom.scale() / zoomFactor);

                context._prevCenterLong = context.centerLong();
                context._prevCenterLat = context.centerLat();
                context._prevZoom = context.zoom();
            })
            .on("zoomend", function () {
            })
        ;

        this._zoomGrab = element.append("rect")
            .attr("class", "background")
        ;

        this._layersTarget = element.append("g")
            .attr("class", "layersTarget")
        ;

        element.call(this._zoom);
    };

    Layered.prototype.update = function (domNode, element) {
        SVGWidget.prototype.update.apply(this, arguments);
        if (this._prevCenterLat !== this.centerLat() || this._prevCenterLong !== this.centerLong() || this._prevZoom !== this.zoom()) {
            var projection = d3.geo[this.projection()]()
                .scale(this.zoom() * zoomFactor * projectionFactor)
                .translate([this.width() / 2, this.height() / 2])
            ;
            var center = projection([this.centerLong(), this.centerLat()]) || [this.width() / 2, this.height() / 2];

            this._zoom 
                .scale(this.zoom() * zoomFactor)
                .translate([this.width() - center[0], this.height() - center[1]])
            ;
            this._prevCenterLat = this.centerLat();
            this._prevCenterLong = this.centerLong();
            this._prevZoom = this.zoom();
        }

        this._zoomGrab
            .attr("width", this.width())
            .attr("height", this.height())
        ;

        var layers = this._layersTarget.selectAll(".layerContainer").data(this.layers().filter(function (d) { return d.visible(); }), function (d) { return d.id(); });
        var context = this;
        layers.enter().append("g")
            .attr("id", function (d) { return d.id(); })
            .attr("class", "layerContainer")
            .each(function (d) {
                d._svgElement = d3.select(this);
                d._domElement = context._parentOverlay.append("div");
                d.layerEnter(context, d._svgElement, d._domElement);
            })
        ;
        layers
            .each(function (d) {
                d.layerUpdate(context);
            })
        ;
        layers.exit()
            .each(function (d) {
                d.layerExit(context);
                d._domElement.remove();
            })
            .remove()
        ;
        layers.order();
        this.zoomed();
    };

    Layered.prototype.exit = function (domNode, element) {
        SVGWidget.prototype.exit.apply(this, arguments);
    };

    Layered.prototype.zoomed = function () {
        var layers = this._layersTarget.selectAll(".layerContainer");
        var context = this;
        layers
            .each(function (d) {
                d.layerZoomed(context);
            })
        ;
    };

    Layered.prototype.render = function (callback) {
        var context = this;
        var retVal = SVGWidget.prototype.render.call(this, function (w) {
            if (context._layersTarget && ((context._renderCount && context._autoScaleOnNextRender) || context._prevAutoScaleMode !== context.autoScaleMode())) {
                context._prevAutoScaleMode = context.autoScaleMode();
                context._autoScaleOnNextRender = false;
                setTimeout(function () {
                    context.autoScale();
                    context.autoScale();  //TODO Fix math in autoScale 
                    if (callback) {
                        callback(w);
                    }
                }, 0);
            } else {
                if (callback) {
                    callback(w);
                }
            }
        });
        return retVal;
    };

    Layered.prototype.project = function (lat, long) {
        if (lat >= 90)
            lat = 89;
        else if (lat <= -90)
            lat = -89;
        var pos = this._d3GeoProjection([long, lat]);
        if (pos) {
            pos[0] *= this._zoom.scale();
            pos[1] *= this._zoom.scale();
            pos[0] += this._zoom.translate()[0];
            pos[1] += this._zoom.translate()[1];
        }
        return pos;
    };

    Layered.prototype.invert = function (x, y) {
        x -= this._zoom.translate()[0];
        y -= this._zoom.translate()[1];
        x /= this._zoom.scale();
        y /= this._zoom.scale();
        return this._d3GeoProjection.invert([x, y]);
    };

    Layered.prototype.getBounds = function () {
        var bbox = this._layersTarget.node().getBBox();
        return {
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height
        };
    };

    Layered.prototype.autoScale = function () {
        switch (this.autoScaleMode()) {
            case "none":
                return;
            case "all":
                this.shrinkToFit(this.getBounds());
                break;
        }
    };

    Layered.prototype.shrinkToFit = function (rect) {
        if (rect.width && rect.height) {
            var width = this.width();
            var height = this.height();
            var translate = this._zoom.translate();
            var scale = this._zoom.scale();

            rect.x += rect.width / 2;
            rect.y += rect.height / 2;
            translate[0] -= (rect.x - width / 2);
            translate[1] -= (rect.y - height / 2);

            var newScale = scale * Math.min(width / rect.width, height / rect.height);
            this._zoom
                .translate(translate)
                .scale(newScale)
                .event(this._layersTarget)
            ;
        } else {
            console.log("Layered.prototype.shrinkToFit - invalid rect:  " + rect);
        }
    };

    return Layered;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/Layer.js',["./Layered", "../api/ITooltip"], factory);
    } else {
        root.map_Layer = factory(root.map_Layered, root.api_ITooltip);
    }
}(this, function (Layered, ITooltip) {
    function Layer(id) {
        Layered.call(this);
        ITooltip.call(this);
    }
    Layer.prototype = Object.create(Layered.prototype);
    Layer.prototype.constructor = Layer;
    Layer.prototype._class += " map_Layer";
    Layer.prototype.implements(ITooltip.prototype);

    Layer.prototype.layerEnter = function (base, svgElement, domElement) {
        this._parentOverlay = base._parentOverlay;
    };

    Layer.prototype.enter = function (domNode, element) {
        Layered.prototype.enter.apply(this, arguments);
        this._svgElement = this._layersTarget.append("g");
        this._domElement = this._parentOverlay.append("div");
        this.layerEnter(this, this._svgElement, this._domElement);
    };

    Layer.prototype.layerUpdate = function (base) {
    };

    Layer.prototype.update = function (domNode, element) {
        Layered.prototype.update.apply(this, arguments);
        this.layerUpdate(this);
    };

    Layer.prototype.layerExit = function (base) {
    };

    Layer.prototype.exit = function (domNode, element) {
        this.layerExit(this);
        this._svgElement.remove();
        this._domElement.remove();
        Layered.prototype.exit.apply(this, arguments);
    };

    Layer.prototype.layerZoomed = function (base) {
    };

    Layer.prototype.zoomed = function () {
        Layered.prototype.zoomed.apply(this, arguments);
        this.layerZoomed(this);
    };

    return Layer;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/Choropleth',["d3", "topojson", "./Layer", "../common/Palette", "../common/Utility", "css!./Choropleth"], factory);
    } else {
        root.map_Choropleth = factory(root.d3, root.topojson, root.map_Layer, root.common_Palette, root.common_Utility);
    }
}(this, function (d3, topojson, Layer, Palette, Utility) {
    function Choropleth() {
        Layer.call(this);
        Utility.SimpleSelectionMixin.call(this);

        this._dataMap = {};
        this._path = d3.select(null);
    }
    Choropleth.prototype = Object.create(Layer.prototype);
    Choropleth.prototype.constructor = Choropleth;
    Choropleth.prototype._class += " map_Choropleth";
    Choropleth.prototype.mixin(Utility.SimpleSelectionMixin);

    Choropleth.prototype._palette = Palette.rainbow("default");

    Choropleth.prototype.publish("paletteID", "YlOrRd", "set", "Palette ID", Choropleth.prototype._palette.switch(), { tags: ["Basic", "Shared"] });
    Choropleth.prototype.publish("useClonedPalette", false, "boolean", "Enable or disable using a cloned palette", null, { tags: ["Intermediate", "Shared"] });

    Choropleth.prototype.publish("opacity", 1.0, "number", "Opacity", null, { tags: ["Advanced"] });

    Choropleth.prototype.publish("meshVisible", true, "boolean", "Mesh Visibility");
    Choropleth.prototype.publish("meshColor", null, "html-color", "Stroke Color", null, { optional: true });
    Choropleth.prototype.publish("meshStrokeWidth", 0.25, "number", "Stroke Width");
    Choropleth.prototype.publish("internalOnly", false, "boolean", "Internal mesh only");
    Choropleth.prototype.publish("autoScaleMode", "mesh", "set", "Auto Scale", ["none", "mesh", "data"], { tags: ["Basic"], override: true });

    Choropleth.prototype.data = function (_) {
        var retVal = Layer.prototype.data.apply(this, arguments);
        if (arguments.length) {
            this._dataMap = {};
            this._dataMinWeight = null;
            this._dataMaxWeight = null;

            var context = this;
            this.data().forEach(function (item) {
                context._dataMap[item[0]] = item;
                if (!context._dataMinWeight || item[1] < context._dataMinWeight) {
                    context._dataMinWeight = item[1];
                }
                if (!context._dataMaxWeight || item[1] > context._dataMaxWeight) {
                    context._dataMaxWeight = item[1];
                }
            });
        }
        return retVal;
    };

    Choropleth.prototype.getDataBounds = function () {
        var bbox = this._choroplethData.node().getBBox();
        var retVal = {
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height
        };
        var scale = this._zoom.scale();
        retVal.x *= scale;
        retVal.y *= scale;
        retVal.width *= scale;
        retVal.height *= scale;
        var translate = this._zoom.translate();
        retVal.x += translate[0];
        retVal.y += translate[1];
        return retVal;
    };

    Choropleth.prototype.autoScale = function () {
        switch (this.autoScaleMode()) {
            case "none":
                return;
            case "mesh":
                this.shrinkToFit(this.getBounds());
                break;
            case "data":
                this.shrinkToFit(this.getDataBounds());
                break;
        }
    };

    Choropleth.prototype.layerEnter = function (base, svgElement, domElement) {
        Layer.prototype.layerEnter.apply(this, arguments);

        this._choroplethTransform = svgElement;
        this._choroplethData = this._choroplethTransform.append("g");
        this._choropleth = this._choroplethTransform.append("path")
            .attr("class", "mesh")
        ;
    };

    Choropleth.prototype.layerUpdate = function (base, forcePath) {
        Layer.prototype.layerUpdate.apply(this, arguments);

        this._palette = this._palette.switch(this.paletteID());
        if (this.useClonedPalette()) {
            this._palette = this._palette.cloneNotExists(this.paletteID() + "_" + this.id());
        }

        if (!this.visible() || !this.meshVisible()) {
            this._choropleth.attr("d", "");
            delete this._prevProjection;
            return;
        }

        if (forcePath || this._prevProjection !== base.projection() || this._prevInternalOnly !== this.internalOnly()) {
            this._choropleth
                .attr("d", base._d3GeoPath(topojson.mesh(this._choroTopology, this._choroTopologyObjects, this.internalOnly() ? function (a, b) { return a !== b; } : function (a, b) { return true; })))
            ;
            this._prevProjection = base.projection();
            this._prevInternalOnly = this.internalOnly();
        }
        this._choroplethTransform
            .style("opacity", this.opacity())
            .style("stroke", this.meshColor())
        ;
    };

    Choropleth.prototype.layerExit = function (base) {
        delete this._prevProjection;
        delete this._prevInternalOnly;
    };

    Choropleth.prototype.layerZoomed = function (base) {
        Layer.prototype.layerZoomed.apply(this, arguments);

        this._choroplethTransform
            .attr("transform", "translate(" + base._zoom.translate() + ")scale(" + base._zoom.scale() + ")")
            .style("stroke-width", this.meshStrokeWidth() / base._zoom.scale() + "px")
        ;
    };

    //  Events  ---
    Choropleth.prototype.click = function (row, column, selected) {
        console.log("Click:  " + JSON.stringify(row) + ", " + column + ", " + selected);
    };

    Choropleth.prototype.dblclick = function (row, column, selected) {
        console.log("Double click:  " + JSON.stringify(row) + ", " + column + ", " + selected);
    };

    return Choropleth;
}));

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/countries.js',[], factory);
    } else {
        root.map_countries = factory();
    }
}(this, function () {
    return {
        countryNames: {
            "-1": { name: "Northern Cyprus"},
            "-2": { name: "Kosovo"},
            "-3": { name: "Somaliland"},
            "4": { name: "Afghanistan"},
            "8": { name: "Albania"},
            "10": { name: "Antarctica"},
            "12": { name: "Algeria"},
            "16": { name: "American Samoa"},
            "20": { name: "Andorra"},
            "24": { name: "Angola"},
            "28": { name: "Antigua and Barbuda"},
            "31": { name: "Azerbaijan"},
            "32": { name: "Argentina"},
            "36": { name: "Australia"},
            "40": { name: "Austria"},
            "44": { name: "Bahamas"},
            "48": { name: "Bahrain"},
            "50": { name: "Bangladesh"},
            "51": { name: "Armenia"},
            "52": { name: "Barbados"},
            "56": { name: "Belgium"},
            "60": { name: "Bermuda"},
            "64": { name: "Bhutan"},
            "68": { name: "Bolivia, Plurinational State of"},
            "70": { name: "Bosnia and Herzegovina"},
            "72": { name: "Botswana"},
            "74": { name: "Bouvet Island"},
            "76": { name: "Brazil"},
            "84": { name: "Belize"},
            "86": { name: "British Indian Ocean Territory"},
            "90": { name: "Solomon Islands"},
            "92": { name: "Virgin Islands, British"},
            "96": { name: "Brunei Darussalam"},
            "100": { name: "Bulgaria"},
            "104": { name: "Myanmar"},
            "108": { name: "Burundi"},
            "112": { name: "Belarus"},
            "116": { name: "Cambodia"},
            "120": { name: "Cameroon"},
            "124": { name: "Canada"},
            "132": { name: "Cape Verde"},
            "136": { name: "Cayman Islands"},
            "140": { name: "Central African Republic"},
            "144": { name: "Sri Lanka"},
            "148": { name: "Chad"},
            "152": { name: "Chile"},
            "156": { name: "China"},
            "158": { name: "Taiwan, Province of China"},
            "162": { name: "Christmas Island"},
            "166": { name: "Cocos (Keeling) Islands"},
            "170": { name: "Colombia"},
            "174": { name: "Comoros"},
            "175": { name: "Mayotte"},
            "178": { name: "Congo"},
            "180": { name: "Congo, the Democratic Republic of the"},
            "184": { name: "Cook Islands"},
            "188": { name: "Costa Rica"},
            "191": { name: "Croatia"},
            "192": { name: "Cuba"},
            "196": { name: "Cyprus"},
            "203": { name: "Czech Republic"},
            "204": { name: "Benin"},
            "208": { name: "Denmark"},
            "212": { name: "Dominica"},
            "214": { name: "Dominican Republic"},
            "218": { name: "Ecuador"},
            "222": { name: "El Salvador"},
            "226": { name: "Equatorial Guinea"},
            "231": { name: "Ethiopia"},
            "232": { name: "Eritrea"},
            "233": { name: "Estonia"},
            "234": { name: "Faroe Islands"},
            "238": { name: "Falkland Islands (Malvinas)"},
            "239": { name: "South Georgia and the South Sandwich Islands"},
            "242": { name: "Fiji"},
            "246": { name: "Finland"},
            "248": { name: "�land Islands"},
            "250": { name: "France"},
            "254": { name: "French Guiana"},
            "258": { name: "French Polynesia"},
            "260": { name: "French Southern Territories"},
            "262": { name: "Djibouti"},
            "266": { name: "Gabon"},
            "268": { name: "Georgia"},
            "270": { name: "Gambia"},
            "275": { name: "Palestinian Territory, Occupied"},
            "276": { name: "Germany"},
            "288": { name: "Ghana"},
            "292": { name: "Gibraltar"},
            "296": { name: "Kiribati"},
            "300": { name: "Greece"},
            "304": { name: "Greenland"},
            "308": { name: "Grenada"},
            "312": { name: "Guadeloupe"},
            "316": { name: "Guam"},
            "320": { name: "Guatemala"},
            "324": { name: "Guinea"},
            "328": { name: "Guyana"},
            "332": { name: "Haiti"},
            "334": { name: "Heard Island and McDonald Islands"},
            "336": { name: "Holy See (Vatican City State)"},
            "340": { name: "Honduras"},
            "344": { name: "Hong Kong"},
            "348": { name: "Hungary"},
            "352": { name: "Iceland"},
            "356": { name: "India"},
            "360": { name: "Indonesia"},
            "364": { name: "Iran, Islamic Republic of"},
            "368": { name: "Iraq"},
            "372": { name: "Ireland"},
            "376": { name: "Israel"},
            "380": { name: "Italy"},
            "384": { name: "C�te d'Ivoire"},
            "388": { name: "Jamaica"},
            "392": { name: "Japan"},
            "398": { name: "Kazakhstan"},
            "400": { name: "Jordan"},
            "404": { name: "Kenya"},
            "408": { name: "Korea, Democratic People's Republic of"},
            "410": { name: "Korea, Republic of"},
            "414": { name: "Kuwait"},
            "417": { name: "Kyrgyzstan"},
            "418": { name: "Lao People's Democratic Republic"},
            "422": { name: "Lebanon"},
            "426": { name: "Lesotho"},
            "428": { name: "Latvia"},
            "430": { name: "Liberia"},
            "434": { name: "Libya"},
            "438": { name: "Liechtenstein"},
            "440": { name: "Lithuania"},
            "442": { name: "Luxembourg"},
            "446": { name: "Macao"},
            "450": { name: "Madagascar"},
            "454": { name: "Malawi"},
            "458": { name: "Malaysia"},
            "462": { name: "Maldives"},
            "466": { name: "Mali"},
            "470": { name: "Malta"},
            "474": { name: "Martinique"},
            "478": { name: "Mauritania"},
            "480": { name: "Mauritius"},
            "484": { name: "Mexico"},
            "492": { name: "Monaco"},
            "496": { name: "Mongolia"},
            "498": { name: "Moldova, Republic of"},
            "499": { name: "Montenegro"},
            "500": { name: "Montserrat"},
            "504": { name: "Morocco"},
            "508": { name: "Mozambique"},
            "512": { name: "Oman"},
            "516": { name: "Namibia"},
            "520": { name: "Nauru"},
            "524": { name: "Nepal"},
            "528": { name: "Netherlands"},
            "531": { name: "Cura�ao"},
            "533": { name: "Aruba"},
            "534": { name: "Sint Maarten (Dutch part)"},
            "535": { name: "Bonaire, Sint Eustatius and Saba"},
            "540": { name: "New Caledonia"},
            "548": { name: "Vanuatu"},
            "554": { name: "New Zealand"},
            "558": { name: "Nicaragua"},
            "562": { name: "Niger"},
            "566": { name: "Nigeria"},
            "570": { name: "Niue"},
            "574": { name: "Norfolk Island"},
            "578": { name: "Norway"},
            "580": { name: "Northern Mariana Islands"},
            "581": { name: "United States Minor Outlying Islands"},
            "583": { name: "Micronesia, Federated States of"},
            "584": { name: "Marshall Islands"},
            "585": { name: "Palau"},
            "586": { name: "Pakistan"},
            "591": { name: "Panama"},
            "598": { name: "Papua New Guinea"},
            "600": { name: "Paraguay"},
            "604": { name: "Peru"},
            "608": { name: "Philippines"},
            "612": { name: "Pitcairn"},
            "616": { name: "Poland"},
            "620": { name: "Portugal"},
            "624": { name: "Guinea-Bissau"},
            "626": { name: "Timor-Leste"},
            "630": { name: "Puerto Rico"},
            "634": { name: "Qatar"},
            "638": { name: "R�union"},
            "642": { name: "Romania"},
            "643": { name: "Russian Federation"},
            "646": { name: "Rwanda"},
            "652": { name: "Saint Barth�lemy"},
            "654": { name: "Saint Helena, Ascension and Tristan da Cunha"},
            "659": { name: "Saint Kitts and Nevis"},
            "660": { name: "Anguilla"},
            "662": { name: "Saint Lucia"},
            "663": { name: "Saint Martin (French part)"},
            "666": { name: "Saint Pierre and Miquelon"},
            "670": { name: "Saint Vincent and the Grenadines"},
            "674": { name: "San Marino"},
            "678": { name: "Sao Tome and Principe"},
            "682": { name: "Saudi Arabia"},
            "686": { name: "Senegal"},
            "688": { name: "Serbia"},
            "690": { name: "Seychelles"},
            "694": { name: "Sierra Leone"},
            "702": { name: "Singapore"},
            "703": { name: "Slovakia"},
            "704": { name: "Viet Nam"},
            "705": { name: "Slovenia"},
            "706": { name: "Somalia"},
            "710": { name: "South Africa"},
            "716": { name: "Zimbabwe"},
            "724": { name: "Spain"},
            "728": { name: "South Sudan"},
            "729": { name: "Sudan"},
            "732": { name: "Western Sahara"},
            "740": { name: "Suriname"},
            "744": { name: "Svalbard and Jan Mayen"},
            "748": { name: "Swaziland"},
            "752": { name: "Sweden"},
            "756": { name: "Switzerland"},
            "760": { name: "Syrian Arab Republic"},
            "762": { name: "Tajikistan"},
            "764": { name: "Thailand"},
            "768": { name: "Togo"},
            "772": { name: "Tokelau"},
            "776": { name: "Tonga"},
            "780": { name: "Trinidad and Tobago"},
            "784": { name: "United Arab Emirates"},
            "788": { name: "Tunisia"},
            "792": { name: "Turkey"},
            "795": { name: "Turkmenistan"},
            "796": { name: "Turks and Caicos Islands"},
            "798": { name: "Tuvalu"},
            "800": { name: "Uganda"},
            "804": { name: "Ukraine"},
            "807": { name: "Macedonia, the former Yugoslav Republic of"},
            "818": { name: "Egypt"},
            "826": { name: "United Kingdom"},
            "831": { name: "Guernsey"},
            "832": { name: "Jersey"},
            "833": { name: "Isle of Man"},
            "834": { name: "Tanzania, United Republic of"},
            "840": { name: "United States"},
            "850": { name: "Virgin Islands, U.S."},
            "854": { name: "Burkina Faso"},
            "858": { name: "Uruguay"},
            "860": { name: "Uzbekistan"},
            "862": { name: "Venezuela, Bolivarian Republic of"},
            "876": { name: "Wallis and Futuna"},
            "882": { name: "Samoa"},
            "887": { name: "Yemen"},
            "894": { name: "Zambia"}
        },
        topology: {"type":"Topology","objects":{"land":{"type":"MultiPolygon","arcs":[[[0]],[[1]],[[2]],[[3]],[[4]],[[5]],[[6]],[[7,8,9]],[[10,11,12,13]],[[14]],[[15]],[[16]],[[17]],[[18]],[[19]],[[20]],[[21,22]],[[23]],[[24]],[[25]],[[26]],[[27]],[[28]],[[29]],[[30]],[[31,32]],[[33]],[[34]],[[35]],[[36]],[[37]],[[38]],[[39]],[[40]],[[41]],[[42]],[[43]],[[44,45]],[[46]],[[47]],[[48]],[[49,50,51,52]],[[53]],[[54]],[[55]],[[56]],[[57]],[[58]],[[59]],[[60]],[[61]],[[62]],[[63]],[[64,65]],[[66]],[[67]],[[68]],[[69]],[[70]],[[71]],[[72]],[[73]],[[74]],[[75]],[[76]],[[77]],[[78,79]],[[80]],[[81]],[[82]],[[83]],[[84]],[[85]],[[86]],[[87]],[[88]],[[89]],[[90]],[[91]],[[92,93]],[[94]],[[95]],[[96,97,98,99,100,101,102,103]],[[104]],[[105]],[[106]],[[107]],[[108]],[[109]],[[110]],[[111,112]],[[113]],[[114,115]],[[116,117]],[[118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229]],[[230,231]],[[232]],[[233]],[[234]],[[235]],[[236]],[[237]],[[238,239,240,241]],[[242]],[[243]],[[244]],[[245]],[[246]],[[247]],[[248]],[[249]],[[250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292,293,294,295,296,297,298,299,300,301,302,303,304,305,306,307,308,309,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,329,330,331,332,333,334,335,336,337,338,339,340,341,342,343,344,345,346,347,348,349,350,351,352,353,354,355,356,357,358,359,360,361,362,363,364,365,366,367,368,369,370,371,372,373,374,375,376,377,378,379,380,381,382,383,384,385,386,387,388,389,390,391,392,393,394,395,396,397,398,399,400,401,402,403,404,405,406,407,408,409,410,411,412,413,414,415,416,417,418,419,420,421,422,423,424,425,426,427,428,429,430,431,432,433,434,435,436,437,438,439,440,441,442,443,444,445,446,447,448,449,450,451,452,453,454,455,456,457,458,459,460,461,462,463,464,465,466,467],[468,469,470,471,472,473,474,475,476,477]],[[478]],[[479]],[[480]],[[481]],[[482]],[[483]],[[484]],[[485]],[[486]],[[487]],[[488]],[[489]],[[490]],[[491]]]},"countries":{"type":"GeometryCollection","bbox":[-179.99999999999997,-90.00000000000003,180.00000000000014,83.64513000000001],"geometries":[{"type":"Polygon","id":4,"arcs":[[492,493,494,495,496,497]]},{"type":"MultiPolygon","id":24,"arcs":[[[498,499,334,500,336,501,502]],[[339,503,504]]]},{"type":"Polygon","id":8,"arcs":[[505,506,398,507,508,509]]},{"type":"Polygon","id":784,"arcs":[[297,510,299,511,512]]},{"type":"MultiPolygon","id":32,"arcs":[[[513,13]],[[514,515,516,517,172,518,174,519,520]]]},{"type":"Polygon","id":51,"arcs":[[521,522,523,524,525]]},{"type":"MultiPolygon","id":10,"arcs":[[[0]],[[1]],[[2]],[[3]],[[4]],[[5]],[[6]],[[526,527,9]]]},{"type":"Polygon","id":260,"arcs":[[15]]},{"type":"MultiPolygon","id":36,"arcs":[[[16]],[[26]]]},{"type":"Polygon","id":40,"arcs":[[528,529,530,531,532,533,534]]},{"type":"MultiPolygon","id":31,"arcs":[[[535,-525]],[[477,536,469,537,471,538,-523,539,540]]]},{"type":"Polygon","id":108,"arcs":[[541,542,543]]},{"type":"Polygon","id":56,"arcs":[[544,545,546,547,419]]},{"type":"Polygon","id":204,"arcs":[[548,549,550,551,552]]},{"type":"Polygon","id":854,"arcs":[[553,554,555,-551,556,557]]},{"type":"Polygon","id":50,"arcs":[[558,280,559,282,560]]},{"type":"Polygon","id":100,"arcs":[[561,395,562,563,564,565]]},{"type":"MultiPolygon","id":44,"arcs":[[[73]],[[75]],[[76]]]},{"type":"Polygon","id":70,"arcs":[[566,567,568]]},{"type":"Polygon","id":112,"arcs":[[569,570,571,572,573]]},{"type":"Polygon","id":84,"arcs":[[574,148,575]]},{"type":"Polygon","id":68,"arcs":[[576,577,578,579,-521]]},{"type":"Polygon","id":76,"arcs":[[-516,580,-579,581,582,583,584,585,586,165,587,167,588,169,589]]},{"type":"Polygon","id":96,"arcs":[[50,590]]},{"type":"Polygon","id":64,"arcs":[[591,592]]},{"type":"Polygon","id":72,"arcs":[[593,594,595,596]]},{"type":"Polygon","id":140,"arcs":[[597,598,599,600,601,602,603]]},{"type":"MultiPolygon","id":124,"arcs":[[[86]],[[87]],[[88]],[[89]],[[90]],[[105]],[[106]],[[108]],[[110]],[[113]],[[604,119,605,121,606,123,607,125,608,127,609,129,610,209,611,211,612,223,613,225,614,227,615,229]],[[616,231]],[[232]],[[233]],[[234]],[[235]],[[237]],[[238,617,240,618]],[[243]],[[245]],[[246]],[[248]],[[249]],[[478]],[[479]],[[481]],[[482]],[[483]],[[489]],[[490]]]},{"type":"Polygon","id":756,"arcs":[[-532,619,620,621]]},{"type":"MultiPolygon","id":152,"arcs":[[[-514,10,622,12]],[[-520,175,623,177,624,-577]]]},{"type":"MultiPolygon","id":156,"arcs":[[[66]],[[625,269,626,271,627,628,629,630,-593,631,632,633,634,-496,635,636,637,638,639,640]]]},{"type":"Polygon","id":384,"arcs":[[348,641,642,643,-554,644]]},{"type":"Polygon","id":120,"arcs":[[645,646,343,647,648,649,650,-604,651]]},{"type":"Polygon","id":180,"arcs":[[652,653,-542,654,655,-503,338,-505,656,-602,657]]},{"type":"Polygon","id":178,"arcs":[[-504,340,658,-652,-603,-657]]},{"type":"Polygon","id":170,"arcs":[[659,180,660,661,157,662,-583,663]]},{"type":"Polygon","id":188,"arcs":[[185,664,152,665]]},{"type":"Polygon","id":192,"arcs":[[72]]},{"type":"Polygon","id":-99,"arcs":[[79,666]]},{"type":"Polygon","id":196,"arcs":[[78,-667]]},{"type":"Polygon","id":203,"arcs":[[-534,667,668,669]]},{"type":"Polygon","id":276,"arcs":[[426,670,-668,-533,-622,671,672,-546,673,421,674]]},{"type":"Polygon","id":262,"arcs":[[316,675,676,677]]},{"type":"MultiPolygon","id":208,"arcs":[[[94]],[[678,-675,422,679,424]]]},{"type":"Polygon","id":214,"arcs":[[64,680]]},{"type":"Polygon","id":12,"arcs":[[681,682,683,684,685,365,686,687]]},{"type":"Polygon","id":218,"arcs":[[179,-660,688]]},{"type":"Polygon","id":818,"arcs":[[313,689,690,371,691,373,692]]},{"type":"Polygon","id":232,"arcs":[[693,694,315,-678]]},{"type":"Polygon","id":724,"arcs":[[417,695,411,696,413,697]]},{"type":"Polygon","id":233,"arcs":[[698,434,699,700]]},{"type":"Polygon","id":231,"arcs":[[-677,701,702,703,704,705,706,-694]]},{"type":"Polygon","id":246,"arcs":[[707,436,708,709]]},{"type":"MultiPolygon","id":242,"arcs":[[[20]],[[22,21]]]},{"type":"Polygon","id":238,"arcs":[[14]]},{"type":"MultiPolygon","id":250,"arcs":[[[710,711,164,-587]],[[84]],[[712,-672,-621,713,410,-696,418,-548]]]},{"type":"Polygon","id":266,"arcs":[[341,714,-646,-659]]},{"type":"MultiPolygon","id":826,"arcs":[[[715,92]],[[716,97,717,99,718,101,719,103]]]},{"type":"Polygon","id":268,"arcs":[[385,720,-540,-522,721]]},{"type":"Polygon","id":288,"arcs":[[347,-645,-558,722]]},{"type":"Polygon","id":324,"arcs":[[723,724,351,725,726,727,-643]]},{"type":"Polygon","id":270,"arcs":[[354,728]]},{"type":"Polygon","id":624,"arcs":[[352,729,-726]]},{"type":"Polygon","id":226,"arcs":[[342,-647,-715]]},{"type":"MultiPolygon","id":300,"arcs":[[[80]],[[397,-507,730,-564,731]]]},{"type":"Polygon","id":304,"arcs":[[491]]},{"type":"Polygon","id":320,"arcs":[[189,732,-576,149,733,734]]},{"type":"Polygon","id":328,"arcs":[[162,735,-585,736]]},{"type":"Polygon","id":340,"arcs":[[187,737,-734,150,738]]},{"type":"Polygon","id":191,"arcs":[[739,-569,740,401,741,742]]},{"type":"Polygon","id":332,"arcs":[[-681,65]]},{"type":"Polygon","id":348,"arcs":[[-529,743,744,745,746,-743,747]]},{"type":"MultiPolygon","id":360,"arcs":[[[28]],[[748,32]],[[33]],[[34]],[[37]],[[38]],[[41]],[[42]],[[749,45]],[[46]],[[47]],[[750,52]],[[48]]]},{"type":"Polygon","id":356,"arcs":[[-634,751,-632,-592,-631,752,-561,283,753,285,754]]},{"type":"Polygon","id":372,"arcs":[[93,-716]]},{"type":"Polygon","id":364,"arcs":[[755,-498,756,287,757,289,758,759,760,-536,-524,-539,472]]},{"type":"Polygon","id":368,"arcs":[[761,762,763,764,765,766,-760]]},{"type":"Polygon","id":352,"arcs":[[109]]},{"type":"Polygon","id":376,"arcs":[[767,768,769,-693,374,770,376,771,772]]},{"type":"MultiPolygon","id":380,"arcs":[[[81]],[[82]],[[773,403,774,405,775,407,776,409,-714,-620,-531]]]},{"type":"Polygon","id":388,"arcs":[[63]]},{"type":"Polygon","id":400,"arcs":[[-768,777,-765,778,312,-770,779]]},{"type":"MultiPolygon","id":392,"arcs":[[[77]],[[83]],[[85]]]},{"type":"Polygon","id":398,"arcs":[[780,781,474,782,-638,783]]},{"type":"Polygon","id":404,"arcs":[[322,784,785,786,-704,787]]},{"type":"Polygon","id":417,"arcs":[[-784,-637,788,789]]},{"type":"Polygon","id":116,"arcs":[[790,791,792,273]]},{"type":"Polygon","id":410,"arcs":[[262,793,264,794]]},{"type":"Polygon","id":-99,"arcs":[[-510,795,796,797]]},{"type":"Polygon","id":414,"arcs":[[291,798,-763]]},{"type":"Polygon","id":418,"arcs":[[799,800,-629,801,-792]]},{"type":"Polygon","id":422,"arcs":[[-772,377,802]]},{"type":"Polygon","id":430,"arcs":[[349,803,-724,-642]]},{"type":"Polygon","id":434,"arcs":[[804,-688,805,368,806,370,-691,807,808]]},{"type":"Polygon","id":144,"arcs":[[54]]},{"type":"Polygon","id":426,"arcs":[[809]]},{"type":"Polygon","id":440,"arcs":[[810,811,812,-570,813]]},{"type":"Polygon","id":442,"arcs":[[-673,-713,-547]]},{"type":"Polygon","id":428,"arcs":[[432,814,-701,815,-571,-813]]},{"type":"Polygon","id":504,"arcs":[[-686,816,360,817,362,818,364]]},{"type":"Polygon","id":498,"arcs":[[819,820]]},{"type":"Polygon","id":450,"arcs":[[25]]},{"type":"Polygon","id":484,"arcs":[[821,147,-575,-733,190,822,192,823,194,824,196,825,198,826]]},{"type":"Polygon","id":807,"arcs":[[-798,827,-565,-731,-506]]},{"type":"Polygon","id":466,"arcs":[[828,-683,829,-555,-644,-728,830]]},{"type":"Polygon","id":104,"arcs":[[277,831,279,-559,-753,-630,-801,832]]},{"type":"Polygon","id":499,"arcs":[[833,400,-741,-568,834,-796,-509]]},{"type":"Polygon","id":496,"arcs":[[835,-640]]},{"type":"Polygon","id":508,"arcs":[[836,325,837,838,839,840,841,842]]},{"type":"Polygon","id":478,"arcs":[[843,356,844,358,845,-684,-829]]},{"type":"Polygon","id":454,"arcs":[[-843,846,847]]},{"type":"MultiPolygon","id":458,"arcs":[[[275,848]],[[-751,49,-591,51]]]},{"type":"Polygon","id":516,"arcs":[[333,-500,849,-595,850]]},{"type":"Polygon","id":540,"arcs":[[19]]},{"type":"Polygon","id":562,"arcs":[[-556,-830,-682,-805,851,-650,852,-552]]},{"type":"Polygon","id":566,"arcs":[[345,-553,-853,-649]]},{"type":"Polygon","id":558,"arcs":[[186,-739,151,-665]]},{"type":"Polygon","id":528,"arcs":[[-674,-545,420]]},{"type":"MultiPolygon","id":578,"arcs":[[[853,-710,854,438,855,440]],[[480]],[[485]],[[486]]]},{"type":"Polygon","id":524,"arcs":[[-752,-633]]},{"type":"MultiPolygon","id":554,"arcs":[[[17]],[[18]]]},{"type":"MultiPolygon","id":512,"arcs":[[[856,304,857,858,-512,300,859,302]],[[-511,298]]]},{"type":"Polygon","id":586,"arcs":[[-635,-755,286,-757,-497]]},{"type":"Polygon","id":591,"arcs":[[860,182,861,184,-666,153,862,155,863,-661]]},{"type":"Polygon","id":604,"arcs":[[-625,178,-689,-664,-582,-578]]},{"type":"MultiPolygon","id":608,"arcs":[[[53]],[[56]],[[57]],[[58]],[[59]],[[60]],[[61]]]},{"type":"MultiPolygon","id":598,"arcs":[[[39]],[[40]],[[-750,44]],[[43]]]},{"type":"Polygon","id":616,"arcs":[[-671,427,864,429,865,-814,-574,866,867,-669]]},{"type":"Polygon","id":630,"arcs":[[62]]},{"type":"Polygon","id":408,"arcs":[[868,261,-795,265,869,870,268,-626]]},{"type":"Polygon","id":620,"arcs":[[-698,414,871,416]]},{"type":"Polygon","id":600,"arcs":[[-580,-581,-515]]},{"type":"Polygon","id":275,"arcs":[[-780,-769]]},{"type":"Polygon","id":634,"arcs":[[295,872]]},{"type":"Polygon","id":642,"arcs":[[873,-821,874,392,875,394,-562,876,-746]]},{"type":"MultiPolygon","id":643,"arcs":[[[91]],[[-866,430,877,-811]],[[114,116,878]],[[236]],[[242]],[[244]],[[247]],[[250,879,252,880,254,881,256,882,258,883,260,-869,-641,-836,-639,-783,475,884,-541,-721,386,885,388,886,-572,-816,-700,435,-708,-854,441,887,443,888,445,889,447,890,449,891,451,892,893,894,455,895,457,896,459,897,461,898,463,899,465,900,111,901]],[[484]],[[487]],[[488]]]},{"type":"Polygon","id":646,"arcs":[[902,-543,-654,903]]},{"type":"Polygon","id":732,"arcs":[[-685,-846,359,-817]]},{"type":"Polygon","id":682,"arcs":[[904,309,905,311,-779,-764,-799,292,906,294,-873,296,-513,-859,907]]},{"type":"Polygon","id":729,"arcs":[[908,909,-599,910,-808,-690,314,-695,-707,911]]},{"type":"Polygon","id":728,"arcs":[[912,-705,-787,913,-658,-601,914,-909]]},{"type":"Polygon","id":686,"arcs":[[355,-844,-831,-727,-730,353,-729]]},{"type":"MultiPolygon","id":90,"arcs":[[[27]],[[29]],[[30]],[[35]],[[36]]]},{"type":"Polygon","id":694,"arcs":[[350,-725,-804]]},{"type":"Polygon","id":222,"arcs":[[188,-735,-738]]},{"type":"Polygon","id":-99,"arcs":[[-702,-676,317,915,916]]},{"type":"Polygon","id":706,"arcs":[[917,321,-788,-703,-917,918,319]]},{"type":"Polygon","id":688,"arcs":[[-566,-828,-797,-835,-567,-740,-747,-877]]},{"type":"Polygon","id":740,"arcs":[[163,-712,919,-586,-736]]},{"type":"Polygon","id":703,"arcs":[[-868,920,-744,-535,-670]]},{"type":"Polygon","id":705,"arcs":[[-530,-748,-742,402,-774]]},{"type":"Polygon","id":752,"arcs":[[-855,-709,437]]},{"type":"Polygon","id":748,"arcs":[[921,-839]]},{"type":"Polygon","id":760,"arcs":[[-778,-773,-803,378,922,-766]]},{"type":"Polygon","id":148,"arcs":[[-852,-809,-911,-598,-651]]},{"type":"Polygon","id":768,"arcs":[[923,-723,-557,-550]]},{"type":"Polygon","id":764,"arcs":[[274,-849,276,-833,-800,-791]]},{"type":"Polygon","id":762,"arcs":[[-789,-636,-495,924]]},{"type":"Polygon","id":795,"arcs":[[-756,473,-782,925,-493]]},{"type":"Polygon","id":626,"arcs":[[31,-749]]},{"type":"Polygon","id":780,"arcs":[[55]]},{"type":"Polygon","id":788,"arcs":[[-687,926,367,-806]]},{"type":"MultiPolygon","id":792,"arcs":[[[-722,-526,-761,-767,-923,379,927,928,382,929,384]],[[-732,-563,396]]]},{"type":"Polygon","id":158,"arcs":[[74]]},{"type":"Polygon","id":834,"arcs":[[-785,930,324,-837,-848,931,-655,-544,-903,932]]},{"type":"Polygon","id":800,"arcs":[[-904,-653,-914,-786,-933]]},{"type":"Polygon","id":804,"arcs":[[-887,389,933,391,-875,-820,-874,-745,-921,-867,-573]]},{"type":"Polygon","id":858,"arcs":[[-590,170,934,-517]]},{"type":"MultiPolygon","id":840,"arcs":[[[67]],[[68]],[[69]],[[70]],[[71]],[[130,935,132,936,134,937,136,938,138,939,940,141,941,143,942,145,-827,199,943,201,944,945,204,946,206,947,208,-611]],[[95]],[[104]],[[107]],[[-613,212,948,214,949,216,950,218,951,220,952,222]]]},{"type":"Polygon","id":860,"arcs":[[-926,-781,-790,-925,-494]]},{"type":"Polygon","id":862,"arcs":[[158,953,160,954,-737,-584,-663]]},{"type":"Polygon","id":704,"arcs":[[272,-793,-802,-628]]},{"type":"MultiPolygon","id":548,"arcs":[[[23]],[[24]]]},{"type":"Polygon","id":887,"arcs":[[305,955,307,-908,-858]]},{"type":"Polygon","id":710,"arcs":[[956,328,957,330,958,332,-851,-594,959,-840,-922,-838,326],[-810]]},{"type":"Polygon","id":894,"arcs":[[-847,-842,960,-596,-850,-499,-656,-932]]},{"type":"Polygon","id":716,"arcs":[[-960,-597,-961,-841]]}]}},"arcs":[[[33452,5736],[-82,-294],[-81,-259],[-582,79],[-621,-34],[-348,192],[0,22],[-152,170],[625,-23],[599,-56],[207,237],[147,203],[288,-237]],[[5775,6048],[-533,-79],[-364,204],[-163,203],[-11,34],[-180,158],[169,214],[517,-90],[277,-181],[212,-203],[76,-260]],[[37457,6883],[342,-248],[120,-350],[33,-248],[11,-293],[-430,-181],[-452,-146],[-522,-136],[-582,-113],[-658,34],[-365,192],[49,237],[593,158],[239,192],[174,248],[126,214],[168,203],[180,238],[0,-1],[141,0],[414,125],[419,-125]],[[16330,9501],[359,-90],[332,102],[-158,-203],[-261,-147],[-386,45],[-278,203],[60,192],[332,-102]],[[15122,9513],[425,-226],[-164,23],[-359,56],[-381,158],[202,124],[277,-135]],[[22505,10404],[305,-79],[304,68],[163,-327],[-217,45],[-337,-23],[-343,23],[-376,-34],[-283,113],[-146,237],[174,101],[353,-79],[403,-45]],[[30985,10967],[33,-259],[-49,-226],[-76,-214],[-326,-79],[-311,-113],[-364,11],[136,226],[-327,-79],[-310,-79],[-212,169],[-16,237],[305,226],[190,67],[321,-22],[82,293],[16,215],[-6,462],[158,271],[256,90],[147,-214],[65,-214],[120,-260],[92,-248],[76,-260]],[[794,3215],[78,48],[94,59],[81,51],[41,25]],[[1088,3398],[41,-1],[29,-10]],[[1158,3387],[402,-239],[352,239],[63,33],[816,102],[265,-135],[130,-68],[419,-192],[789,-147],[625,-180],[1072,-136],[800,158],[1181,-113],[669,-180],[734,169],[773,158],[60,271],[-1094,22],[-898,136],[-234,225],[-745,125],[49,259],[103,237],[104,214],[-55,237],[-462,158],[-212,204],[-430,180],[675,-34],[642,91],[402,-192],[495,169],[457,214],[223,192],[-98,237],[-359,158],[-408,169],[-571,34],[-500,79],[-539,57],[-180,214],[-359,181],[-217,203],[-87,654],[136,-56],[250,-181],[457,57],[441,79],[228,-249],[441,57],[370,124],[348,158],[315,192],[419,56],[-11,215],[-97,214],[81,203],[359,102],[163,-192],[425,113],[321,146],[397,12],[375,56],[376,136],[299,124],[337,124],[218,-34],[190,-45],[414,79],[370,-102],[381,12],[364,79],[375,-57],[414,-56],[386,22],[403,-11],[413,-11],[381,22],[283,170],[337,90],[349,-124],[331,101],[300,203],[179,-180],[98,-203],[180,-192],[288,169],[332,-214],[375,-68],[321,-158],[392,34],[354,101],[418,-22],[376,-79],[381,-102],[147,249],[-180,191],[-136,204],[-359,45],[-158,214],[-60,214],[-98,429],[213,-79],[364,-34],[359,34],[327,-90],[283,-169],[119,-203],[376,-34],[359,79],[381,113],[342,67],[283,-135],[370,45],[239,440],[224,-259],[321,-102],[348,56],[228,-225],[365,-23],[337,-68],[332,-124],[218,215],[108,203],[278,-226],[381,57],[283,-125],[190,-191],[370,56],[288,124],[283,147],[337,79],[392,68],[354,79],[272,124],[163,180],[65,249],[-32,236],[-87,226],[-98,226],[-87,226],[-71,203],[-16,225],[27,226],[130,214],[109,237],[44,226],[-55,248],[-32,226],[136,260],[152,169],[180,214],[190,181],[223,169],[109,248],[152,158],[174,147],[267,34],[174,180],[196,113],[228,68],[202,147],[157,180],[218,68],[163,-147],[-103,-192],[-283,-169],[-120,-124],[-206,90],[-229,-56],[-190,-136],[-202,-146],[-136,-170],[-38,-225],[17,-215],[130,-191],[-190,-136],[-261,-45],[-153,-192],[-163,-180],[-174,-249],[-44,-214],[98,-237],[147,-181],[229,-135],[212,-181],[114,-225],[60,-215],[82,-225],[130,-192],[82,-215],[38,-530],[81,-214],[22,-226],[87,-226],[-38,-304],[-152,-237],[-163,-192],[-370,-79],[-125,-203],[-169,-192],[-419,-215],[-370,-90],[-348,-124],[-376,-124],[-223,-237],[-446,-23],[-489,23],[-441,-45],[-468,0],[87,-226],[424,-101],[311,-158],[174,-204],[-310,-180],[-479,56],[-397,-146],[-17,-237],[-11,-226],[327,-192],[60,-214],[353,-215],[588,-90],[500,-158],[398,-180],[506,-181],[690,-90],[681,-158],[473,-170],[517,-191],[272,-271],[136,-215],[337,204],[457,169],[484,180],[577,147],[495,158],[691,11],[680,-79],[560,-135],[180,248],[386,169],[702,12],[550,124],[522,124],[577,79],[614,102],[430,146],[-196,203],[-119,203],[0,215],[-539,-23],[-571,-90],[-544,0],[-77,214],[39,429],[125,124],[397,136],[468,135],[337,169],[337,170],[251,225],[380,102],[376,79],[190,45],[430,23],[408,79],[343,112],[337,136],[305,135],[386,181],[245,192],[261,169],[82,226],[-294,135],[98,237],[185,181],[288,112],[305,136],[283,180],[217,226],[136,271],[202,158],[331,-34],[136,-192],[332,-22],[11,214],[142,226],[299,-57],[71,-214],[331,-34],[360,102],[348,67],[315,-34],[120,-237],[305,192],[283,102],[315,79],[310,79],[283,135],[310,91],[240,124],[168,203],[207,-147],[288,79],[202,-271],[157,-203],[316,113],[125,226],[283,158],[365,-34],[108,-215],[229,215],[299,68],[326,22],[294,-11],[310,-68],[300,-34],[130,-192],[180,-169],[304,102],[327,22],[315,0],[310,12],[278,79],[294,67],[245,158],[261,102],[283,56],[212,158],[152,316],[158,192],[288,-90],[109,-203],[239,-136],[289,45],[196,-203],[206,-146],[283,135],[98,248],[250,102],[289,192],[272,79],[326,112],[218,125],[228,135],[218,124],[261,-68],[250,203],[180,158],[261,-11],[229,136],[54,203],[234,158],[228,113],[278,90],[256,45],[244,-34],[262,-56],[223,-158],[27,-249],[245,-191],[168,-158],[332,-68],[185,-158],[229,-158],[266,-34],[223,113],[240,237],[261,-124],[272,-68],[261,-68],[272,-45],[277,0],[229,-598],[-11,-147],[-33,-259],[-266,-147],[-218,-214],[38,-226],[310,11],[-38,-225],[-141,-215],[-131,-237],[212,-180],[321,-57],[321,102],[153,226],[92,214],[153,181],[174,169],[70,203],[147,282],[174,57],[316,22],[277,68],[283,90],[136,226],[82,214],[190,215],[272,146],[234,113],[153,192],[157,101],[202,91],[277,-57],[250,57],[272,67],[305,-33],[201,158],[142,383],[103,-158],[131,-271],[234,-112],[266,-46],[267,68],[283,-45],[261,-11],[174,56],[234,-34],[212,-124],[250,79],[300,0],[255,79],[289,-79],[185,192],[141,192],[191,158],[348,429],[179,-79],[212,-158],[185,-203],[354,-350],[272,-12],[256,0],[299,68],[299,79],[229,158],[190,169],[310,23],[207,124],[218,-113],[141,-180],[196,-181],[305,23],[190,-147],[332,-147],[348,-56],[288,45],[218,181],[185,180],[250,45],[251,-79],[288,-56],[261,90],[250,0],[245,-56],[256,-57],[250,102],[299,90],[283,23],[316,0],[255,56],[251,45],[76,282],[11,237],[174,-158],[49,-259],[92,-237],[115,-192],[234,-102],[315,34],[365,12],[250,33],[364,0],[262,12],[364,-23],[310,-45],[196,-181],[-54,-214],[179,-169],[299,-136],[310,-146],[360,-102],[375,-90],[283,-90],[315,-12],[180,192],[245,-158],[212,-180],[245,-136],[337,-56],[321,-68],[136,-226],[316,-135],[212,-203],[310,-90],[321,11],[299,-34],[332,11],[332,-45],[310,-79],[288,-135],[289,-113],[195,-169],[-32,-226],[-147,-203],[-125,-260],[-98,-203],[-131,-237],[-364,-90],[-163,-203],[-360,-124],[-125,-226],[-190,-214],[-201,-181],[-115,-237],[-70,-214],[-28,-260],[6,-214],[158,-226],[60,-214],[130,-204],[517,-78],[109,-249],[-501,-90],[-424,-124],[-528,-23],[-234,-327],[-49,-271],[-119,-214],[-147,-215],[370,-191],[141,-237],[239,-215],[338,-192],[386,-180],[419,-181],[636,-180],[142,-282],[800,-125],[53,-44],[208,-170],[767,147],[636,-181],[-99520,-139],[16,-4],[245,335],[501,-181],[32,21]],[[31400,20215],[-92,-233],[-238,-178]],[[31070,19804],[-301,64]],[[30769,19868],[-202,174],[-291,83],[-350,322],[-283,309],[-383,645],[229,-121],[390,-384],[369,-207],[143,264],[90,394],[256,238],[198,-68]],[[30935,21517],[106,-267],[139,-432],[361,-345],[389,-144],[-125,-288],[-264,-29],[-141,203]],[[33736,22402],[222,-259],[-83,-202],[-375,-173],[-125,202],[-236,-259],[-139,259],[333,345],[236,-144],[167,231]],[[69522,23202],[-427,-37],[-7,306],[41,238],[19,118],[179,-181],[263,-72],[9,-110],[-77,-262]],[[90387,28338],[269,-199],[151,79],[217,111],[166,-39],[20,-684],[-95,-198],[-29,-463],[-97,157],[-193,-401],[-57,31],[-171,18],[-171,493],[-38,380],[-160,502],[7,264],[181,-51]],[[98060,28265],[63,-238],[198,233],[80,-243],[0,-242],[-103,-267],[-182,-424],[-142,-232],[103,-277],[-214,-7],[-238,-217],[-75,-377],[-157,-583],[-219,-257],[-138,-164],[-256,12],[-180,190],[-302,40],[-46,212],[149,427],[349,568],[179,109],[200,219],[238,301],[167,299],[123,429],[106,146],[41,321],[195,267],[61,-245]],[[98502,31008],[202,-607],[5,394],[126,-158],[41,-435],[224,-188],[188,-46],[158,220],[141,-67],[-67,-511],[-85,-336],[-212,12],[-74,-175],[26,-248],[-41,-107],[-105,-310],[-138,-395],[-214,-229],[-48,151],[-116,83],[160,474],[-91,317],[-299,230],[8,209],[201,200],[47,444],[-13,372],[-113,386],[8,102],[-133,237],[-218,510],[-117,408],[104,45],[151,-320],[216,-149],[78,-513]],[[96421,39068],[-105,-138],[-153,155],[-199,259],[-179,306],[-184,406],[-38,195],[119,-8],[156,-196],[122,-196],[89,-161],[228,-357],[144,-265]],[[99547,41844],[96,-167],[-46,-300],[-172,-79],[-153,71],[-27,253],[107,198],[126,-71],[69,95]],[[0,42295],[99822,-141],[-177,-122],[-36,215],[139,118],[88,32],[-99836,180]],[[0,42577],[57,26],[-34,-277],[-23,-31]],[[96623,42347],[-92,-76],[-93,252],[10,155],[175,-331]],[[96418,43229],[45,-464],[-75,72],[-58,-31],[-39,159],[-6,441],[133,-177]],[[63904,44023],[45,-693],[72,-269],[-28,-277],[-49,-169],[-94,338],[-53,-171],[53,-427],[-24,-244],[-77,-133],[-18,-488],[-109,-671],[-137,-793],[-172,-1092],[-106,-800],[-125,-668],[-226,-136],[-243,-244],[-160,147],[-220,206],[-77,304],[-18,510],[-98,460],[-26,414],[50,415],[128,100],[1,191],[133,437],[25,367],[-65,272],[-52,364],[-23,530],[97,322],[38,366],[138,21],[155,118],[103,104],[122,8],[158,328],[229,355],[83,289],[-38,247],[118,-70],[153,401],[6,346],[92,257],[96,-247],[74,-245],[69,-380]],[[89877,43903],[100,-452],[179,217],[92,-243],[133,-225],[-29,-255],[60,-494],[42,-288],[70,-70],[75,-492],[-27,-299],[90,-390],[301,-301],[197,-274],[186,-251],[-37,-139],[159,-361],[108,-623],[111,126],[113,-249],[68,88],[48,-610],[197,-354],[129,-220],[217,-466],[78,-463],[7,-328],[-19,-356],[132,-490],[-16,-509],[-48,-267],[-75,-514],[6,-330],[-55,-413],[-123,-524],[-205,-283],[-102,-446],[-93,-284],[-82,-497],[-107,-287],[-70,-431],[-36,-397],[14,-182],[-159,-200],[-311,-21],[-257,-236],[-127,-223],[-168,-248],[-230,255],[-170,101],[43,301],[-152,-109],[-243,-417],[-240,156],[-158,91],[-159,41],[-269,167],[-179,355],[-52,437],[-64,291],[-137,233],[-267,70],[91,279],[-67,428],[-136,-399],[-247,-106],[146,319],[42,332],[107,282],[-22,427],[-226,-491],[-174,-197],[-106,-458],[-217,237],[9,305],[-174,418],[-147,216],[52,133],[-356,349],[-195,16],[-267,280],[-498,-54],[-359,-206],[-317,-192],[-265,38],[-294,-296],[-241,-132],[-53,-302],[-103,-234],[-236,-14],[-174,-52],[-246,105],[-199,-62],[-191,-27],[-165,-307],[-81,26],[-140,-163],[-133,-183],[-203,23],[-186,0],[-295,368],[-149,109],[6,330],[138,79],[47,131],[-10,207],[34,400],[-31,341],[-147,582],[-45,329],[12,328],[-111,375],[-7,169],[-123,230],[-35,451],[-158,456],[-39,245],[122,-249],[-93,535],[137,-167],[83,-223],[-5,294],[-138,454],[-26,181],[-65,173],[31,333],[56,141],[38,289],[-29,336],[114,415],[21,-439],[118,396],[225,193],[136,245],[212,212],[126,45],[77,-71],[219,214],[168,64],[42,126],[74,53],[153,-14],[292,169],[151,256],[71,307],[163,293],[13,229],[7,314],[194,489],[117,-497],[119,115],[-99,272],[87,279],[122,-125],[34,439],[152,283],[67,227],[140,98],[4,161],[122,-67],[5,145],[122,82],[134,78],[205,-264],[155,-342],[173,-3],[177,-54],[-59,316],[133,462],[126,150],[-44,144],[121,329],[168,203],[142,-68],[234,108],[-5,294],[-204,190],[148,84],[184,-143],[148,-236],[234,-148],[79,59],[172,-177],[162,164],[105,-50],[65,111],[127,-285],[-74,-308],[-105,-233],[-96,-19],[32,-230],[-81,-288],[-99,-283],[20,-163],[221,-318],[214,-184],[143,-199],[201,-341],[78,1],[145,-148],[43,-178],[265,-195],[183,197],[55,309],[56,255],[34,316],[85,458],[-39,279],[20,167],[-32,330],[37,434],[53,117],[-43,192],[67,305],[52,317],[7,164],[104,216],[78,-282],[19,-361],[70,-70],[11,-242],[101,-293],[21,-326],[-10,-209]],[[95032,45793],[78,-198],[-194,3],[-106,355],[166,-140],[56,-20]],[[83531,45933],[-117,-11],[-368,403],[259,113],[146,-175],[97,-175],[-17,-155]],[[94680,46144],[-108,-13],[-170,58],[-58,89],[17,228],[183,-90],[91,-121],[45,-151]],[[94910,46301],[-42,-106],[-206,499],[-57,344],[94,0],[100,-461],[111,-276]],[[84713,46708],[32,136],[239,129],[194,20],[87,72],[105,-72],[-102,-156],[-289,-252],[-233,-165]],[[84746,46420],[-181,-430],[-238,-127],[-33,69],[25,196],[119,351],[275,229]],[[82749,47167],[100,-153],[172,47],[69,-245],[-321,-116],[-193,-77],[-149,4],[95,332],[153,5],[74,203]],[[84139,47168],[-41,-320],[-417,-163],[-370,71],[0,210],[220,120],[174,-173],[185,44],[249,211]],[[94409,47028],[12,-116],[-218,245],[-152,206],[-104,192],[41,59],[128,-138],[228,-265],[65,-183]],[[93760,47598],[-56,-33],[-121,131],[-114,237],[14,96],[166,-243],[111,-188]],[[80172,47926],[533,-57],[61,237],[515,-277],[101,-373],[417,-105],[341,-342],[-317,-220],[-306,232],[-251,-15],[-288,42],[-260,104],[-322,220],[-204,57],[-116,-72],[-506,237],[-48,247],[-255,43],[191,550],[337,-34],[224,-225],[115,-44],[38,-205]],[[87423,48251],[-143,-393],[-27,434],[49,207],[58,195],[63,-169],[0,-274]],[[93299,47902],[-78,-58],[-120,221],[-122,366],[-59,439],[38,55],[30,-171],[84,-130],[135,-366],[131,-195],[-39,-161]],[[92217,48675],[-146,-48],[-44,-161],[-152,-140],[-142,-135],[-148,1],[-228,167],[-158,161],[23,178],[249,-84],[152,45],[42,276],[40,14],[27,-306],[158,44],[78,197],[155,206],[-30,339],[166,11],[56,-94],[-5,-320],[-93,-351]],[[85346,49837],[-104,-191],[-192,106],[-54,248],[281,27],[69,-190]],[[86241,50048],[101,-441],[-234,238],[-232,48],[-157,-38],[-192,20],[65,317],[344,24],[305,-168]],[[92538,49238],[-87,-154],[-52,340],[-65,223],[-126,189],[-158,245],[-200,170],[77,139],[150,-162],[94,-126],[117,-139],[111,-241],[106,-185],[33,-299]],[[89166,50332],[482,-397],[513,-329],[192,-295],[154,-290],[43,-339],[462,-356],[68,-306],[-256,-62],[62,-383],[248,-378],[180,-611],[159,19],[-11,-255],[215,-98],[-84,-108],[295,-243],[-30,-166],[-184,-40],[-69,149],[-238,65],[-281,86],[-216,368],[-158,316],[-144,504],[-362,252],[-235,-164],[-170,-190],[35,-425],[-218,-198],[-155,96],[-288,25]],[[89175,46579],[-247,472],[-282,116],[-69,-164],[-352,-18],[118,469],[175,160],[-72,626],[-134,483],[-538,488],[-229,48],[-417,532],[-82,-279],[-107,-51],[-63,211],[-1,250],[-212,283],[299,207],[198,-11],[-23,153],[-407,1],[-110,343],[-248,106],[-117,285],[374,140],[142,188],[446,-237],[44,-214],[78,-931],[287,-345],[232,611],[319,347],[247,1],[238,-201],[206,-206],[298,-110]],[[84788,52647],[-223,-571],[-209,-111],[-267,113],[-463,-29],[-243,-83],[-39,-436],[248,-512],[150,261],[518,196],[-22,-265],[-121,83],[-121,-337],[-245,-223],[263,-738],[-50,-198],[249,-665],[-2,-378],[-148,-170],[-109,203],[134,471],[-273,-222],[-69,159],[36,222],[-200,338],[21,561],[-186,-175],[24,-671],[11,-824],[-176,-84],[-119,169],[79,530],[-43,556],[-117,4],[-86,395],[115,377],[40,457],[139,868],[58,238],[237,427],[217,-170],[350,-80],[319,24],[275,419],[48,-129]],[[85746,52481],[-15,-503],[-143,57],[-42,-351],[114,-304],[-78,-69],[-112,365],[-82,736],[56,460],[92,210],[20,-315],[164,-50],[26,-236]],[[79393,48459],[-308,-12],[-234,481],[-356,471],[-119,349],[-210,469],[-138,432],[-212,806],[-244,480],[-81,495],[-103,449],[-250,363],[-145,493],[-209,322],[-290,635],[-24,293],[178,-23],[430,-111],[246,-564],[215,-390],[153,-240],[263,-619],[283,-9],[233,-394],[161,-482],[211,-263],[-111,-471],[159,-200],[100,-14],[47,-402],[97,-321],[204,-51],[135,-365],[-70,-716],[-11,-891]],[[80461,52985],[204,-198],[214,108],[56,488],[119,108],[333,125],[199,456],[137,364]],[[81723,54436],[110,215],[236,316]],[[82069,54967],[214,400],[140,450],[112,2],[143,-291],[13,-251],[183,-160],[231,-173],[-20,-226],[-186,-29],[50,-281],[-205,-196]],[[82744,54212],[-158,-520],[204,-545],[-48,-265],[312,-533],[-329,-68],[-93,-393],[12,-522],[-267,-393],[-7,-574],[-107,-881],[-41,205],[-316,-259],[-110,352],[-198,33],[-139,184],[-330,-207],[-101,279],[-182,-32],[-229,67],[-43,772],[-138,160],[-134,493],[-38,504],[32,533],[165,383]],[[85104,56675],[28,-382],[16,-323],[-94,-527],[-102,587],[-130,-292],[89,-425],[-79,-270],[-327,335],[-78,416],[84,274],[-176,273],[-87,-239],[-131,22],[-205,-321],[-46,168],[109,486],[175,161],[151,217],[98,-260],[212,157],[45,257],[196,16],[-16,445],[225,-273],[23,-290],[20,-212]],[[72560,55398],[-242,-132],[-132,458],[-49,828],[126,935],[192,-320],[129,-406],[134,-599],[-42,-600],[-116,-164]],[[33073,57651],[-232,-63],[-50,52],[81,158],[-6,228],[160,75],[58,-20],[-11,-430]],[[84439,57749],[-100,-190],[-87,-363],[-87,-171],[-171,398],[57,154],[70,162],[30,357],[153,34],[-44,-388],[205,556],[-26,-549]],[[82917,57194],[-369,-546],[136,403],[200,355],[167,399],[146,572],[49,-470],[-183,-317],[-146,-396]],[[83856,58678],[166,-179],[177,1],[-5,-240],[-129,-245],[-176,-173],[-10,268],[20,293],[-43,275]],[[84861,58834],[78,-643],[-214,152],[5,-193],[68,-355],[-132,-129],[-11,405],[-84,30],[-43,348],[163,-46],[-4,218],[-169,440],[266,-13],[77,-214]],[[83757,59356],[-74,-498],[-119,288],[-142,438],[238,-21],[97,-207]],[[83700,62485],[171,-164],[85,150],[26,-146],[-46,-239],[95,-413],[-73,-478],[-164,-191],[-43,-465],[62,-458],[147,-64],[123,68],[347,-319],[-27,-313],[91,-139],[-29,-265],[-216,283],[-103,302],[-71,-211],[-177,345],[-253,-86],[-138,128],[14,238],[87,146],[-83,133],[-36,-207],[-137,331],[-41,251],[-11,551],[112,-190],[29,901],[90,522],[169,-1]],[[31780,62327],[-71,-146],[-209,4],[-163,-21],[-16,247],[40,84],[227,-3],[142,-51],[50,-114]],[[28638,62119],[-84,-96],[-156,92],[-159,210],[34,132],[116,40],[64,-19],[187,-52],[147,-138],[46,-158],[-195,-11]],[[30080,63183],[34,98],[217,-3],[165,-148],[73,14],[50,-204],[152,11],[-9,-171],[124,-21],[136,-211],[-103,-235],[-132,126],[-127,-25],[-92,28],[-50,-105],[-106,-36],[-43,140],[-92,-83],[-111,-394],[-71,92],[-14,165]],[[30081,62221],[-185,98],[-131,-40],[-169,42],[-130,-108],[-149,179],[24,186],[256,-80],[210,-46],[100,128],[-127,250],[2,220],[-175,89],[62,159],[170,-25],[241,-90]],[[80649,62586],[-240,-277],[-228,179],[-8,495],[137,261],[304,161],[159,-13],[62,-220],[-122,-254],[-64,-332]],[[6794,62819],[-41,-96],[-69,82],[8,161],[-46,210],[14,64],[48,94],[-19,113],[16,54],[21,-11],[107,-97],[49,-50],[45,-77],[71,-202],[-7,-32],[-108,-123],[-89,-90]],[[6645,63718],[-94,-41],[-47,121],[-32,47],[-3,36],[27,49],[99,-55],[73,-88],[-23,-69]],[[6456,64025],[-9,-63],[-149,17],[21,70],[137,-24]],[[6207,64108],[-15,-33],[-19,8],[-97,20],[-35,130],[-11,23],[74,80],[23,-37],[80,-191]],[[5737,64488],[-33,-57],[-93,105],[14,42],[43,57],[64,-13],[5,-134]],[[27867,64939],[110,-210],[260,65],[98,-136],[235,-356],[173,-260],[92,8],[165,-118],[-20,-162],[205,-23],[210,-236],[-33,-135],[-185,-73],[-187,-29],[-191,46],[-398,-56],[186,321],[-113,150],[-179,38],[-96,166],[-66,328],[-157,-22],[-259,154],[-83,121],[-362,89],[-97,113],[104,144],[-273,29],[-199,-299],[-115,-8],[-40,-141],[-138,-63],[-118,55],[146,178],[60,208],[126,128],[142,112],[210,55],[67,63],[240,-41],[219,-6],[261,-197]],[[28462,65512],[-68,-29],[-70,332],[-104,167],[60,365],[84,-23],[97,-478],[1,-334]],[[83659,64954],[-119,-472],[-146,486],[-32,427],[163,566],[223,436],[127,-172],[-49,-347],[-167,-924]],[[28383,67136],[-303,-92],[-19,213],[130,46],[184,-17],[8,-150]],[[28611,67142],[-48,-409],[-51,73],[4,301],[-124,228],[-1,66],[220,-259]],[[87399,71495],[35,-197],[-156,-349],[-114,185],[-143,-134],[-73,-337],[-181,164],[2,273],[154,344],[158,-67],[114,242],[204,-124]],[[59437,72019],[8,-46],[-285,-234],[-136,74],[-64,232],[132,21]],[[59092,72066],[19,3],[40,139],[200,-8],[253,172],[-188,-245],[21,-108]],[[56583,72391],[152,-194],[216,33],[207,-41],[-7,-100],[151,69],[-35,-170],[-400,-49],[3,95],[-339,112],[52,245]],[[54311,73846],[-100,-453],[41,-179],[-58,-296],[-213,217],[-141,62],[-387,293],[38,296],[325,-53],[284,63],[211,50]],[[52558,75561],[166,-408],[-39,-762],[-126,36],[-113,-192],[-105,153],[-11,694],[-64,330],[153,-29],[139,178]],[[89159,73219],[-104,-460],[48,-288],[-145,-406],[-355,-271],[-488,-36],[-396,-657],[-186,221],[-12,431],[-483,-127],[-329,-271],[-325,-11],[282,-424],[-186,-979],[-179,-242],[-135,224],[69,519],[-176,167],[-113,395],[263,177],[145,362],[280,298],[203,394],[553,171],[297,-117],[291,1024],[185,-275],[408,575],[158,224],[174,704],[-47,648],[117,364],[295,105],[152,-798],[-9,-467],[-256,-580],[4,-594]],[[52655,76104],[-92,-445],[-126,118],[-64,387],[56,214],[179,220],[47,-494]],[[89974,77268],[195,-122],[197,244],[62,-647],[-412,-157],[-244,-572],[-436,393],[-152,-630],[-308,-9],[-39,573],[138,443],[296,32],[81,797],[83,449],[326,-600],[213,-194]],[[32315,78637],[202,-78],[257,16],[-137,-236],[-102,-37],[-353,244],[-69,193],[105,177],[97,-279]],[[32831,80108],[-135,-10],[-360,180],[-258,272],[96,49],[365,-145],[284,-240],[8,-106]],[[15692,79765],[-140,-80],[-456,262],[-84,204],[-248,202],[-50,164],[-286,103],[-107,314],[24,133],[291,-125],[171,-88],[261,-61],[94,-198],[138,-274],[277,-238],[115,-318]],[[34407,81019],[-184,-504],[181,195],[187,-124],[-98,-200],[247,-158],[128,140],[277,-177],[-86,-422],[194,99],[36,-306],[86,-358],[-117,-507],[-125,-21],[-183,109],[60,471],[-77,73],[-322,-499],[-166,20],[196,270],[-267,140],[-298,-34],[-539,17],[-43,171],[173,202],[-121,157],[234,347],[287,917],[172,328],[241,198],[129,-25],[-54,-156],[-148,-363]],[[13136,82950],[267,46],[-84,-654],[242,-463],[-111,1],[-167,264],[-103,265],[-140,179],[-51,253],[16,184],[131,-75]],[[89901,81054],[280,-1020],[-411,190],[-171,-832],[271,-590],[-8,-403],[-211,347],[-182,-445],[-51,483],[31,561],[-32,621],[64,436],[13,770],[-163,566],[24,787],[257,265],[-110,267],[123,81],[73,-381],[96,-555],[-7,-567],[114,-581]],[[47896,83579],[233,23],[298,-356],[-149,-395]],[[48278,82851],[46,-412],[-210,-514],[-493,-340],[-393,87],[225,601],[-145,586],[378,451],[210,269]],[[53524,83854],[-166,-466],[-291,325],[-39,239],[408,191],[88,-289]],[[7498,84721],[-277,-219],[-142,148],[-43,270],[252,205],[148,88],[185,-39],[117,-179],[-240,-274]],[[49420,84027],[270,-740]],[[49690,83287],[190,-93],[171,-656],[79,-227],[337,-110],[-34,-368],[-142,-169],[111,-298],[-250,-302],[-371,6],[-473,-159],[-130,114],[-183,-270],[-257,65],[-195,-220],[-148,115],[407,605],[249,125]],[[49051,81445],[-436,96]],[[48615,81541],[-79,229],[291,179],[-152,310],[52,377]],[[48727,82636],[414,-52]],[[49141,82584],[40,334]],[[49181,82918],[-190,363]],[[48991,83281],[-337,101],[-66,156],[101,258],[-92,158],[-149,-272],[-17,555],[-140,294],[101,595],[216,467],[222,-45],[335,48],[-297,-623],[283,79],[304,-3],[-72,-469],[-250,-516],[287,-37]],[[4006,86330],[-171,-89],[-182,107],[-168,157],[274,98],[220,-52],[27,-221]],[[27981,87625],[-108,-302],[-123,49],[-73,171],[13,40],[107,173],[114,-13],[70,-118]],[[27250,87943],[-325,-317],[-196,13],[-61,156],[207,265],[381,-5],[-6,-112]],[[2297,88560],[171,-109],[173,59],[225,-152],[276,-77],[-23,-63],[-211,-121],[-211,125],[-106,104],[-245,-33],[-66,51],[17,216]],[[26344,89640],[51,-253],[143,89],[161,-151],[304,-198],[318,-179],[25,-274],[204,45],[199,-191],[-247,-181],[-432,138],[-156,259],[-275,-306],[-396,-298],[-95,337],[-377,-55],[242,284],[35,454],[95,527],[201,-47]],[[45969,90100],[-64,-373],[314,-392],[-361,-440],[-801,-394],[-240,-105],[-365,85],[-775,182],[273,254],[-605,282],[492,112],[-12,169],[-583,134],[188,375],[421,85],[433,-391],[422,314],[349,-163],[453,307],[461,-41]],[[28926,90499],[-312,-29],[-69,282],[118,323],[255,80],[217,-160],[3,-246],[-32,-80],[-180,-170]],[[0,91544],[681,-440],[728,-572],[-24,-358],[187,-143],[-64,418],[754,-86],[544,-539],[-276,-251],[-455,-59],[-7,-563],[-111,-120],[-260,17],[-212,201],[-369,168],[-62,250],[-283,94],[-315,-74],[-151,201],[60,214],[-333,-137],[126,-271],[-158,-244]],[[0,89250],[0,2294]],[[23431,91627],[-173,-202],[-374,175],[-226,-63],[-380,259],[245,178],[194,250],[295,-164],[166,-103],[84,-110],[169,-220]],[[99999,92620],[-305,-29],[-49,183],[-99645,240]],[[0,93014],[99999,-394]],[[0,93014],[36,24],[235,-1],[402,-165],[-24,-79],[-286,-138],[-363,-35]],[[0,92620],[0,394]],[[27392,90477],[-544,-402],[-386,-89]],[[26462,89986],[-287,173],[-83,-289],[-268,-486],[-81,-252],[-322,-389],[-397,-38],[-220,-244],[-18,-374],[-323,-72],[-340,-467],[-301,-648],[-108,-454]],[[23714,86446],[-15,-669],[408,-96]],[[24107,85681],[125,-539],[130,-437],[388,114],[517,-250],[277,-219],[199,-272],[348,-158],[294,-243],[459,-33],[302,-56],[-45,-499],[86,-578],[201,-645],[414,-547],[214,188],[150,592],[-145,909],[-196,303],[445,270],[314,404],[154,401]],[[28738,84386],[-22,385],[-189,489]],[[28527,85260],[-338,434],[328,603],[-121,522],[-93,899],[194,133],[476,-157],[286,-56],[230,152],[258,-196],[342,-333],[85,-224]],[[30174,87037],[495,-43],[-8,-484]],[[30661,86510],[92,-728],[254,-90],[201,-339],[402,319],[266,636]],[[31876,86308],[184,268],[216,-515]],[[32276,86061],[362,-734],[307,-691],[-112,-362],[370,-325],[250,-329],[442,-149],[179,-183],[110,-488],[216,-76],[112,-217],[20,-647],[-202,-217],[-199,-202],[-458,-205],[-349,-473],[-470,-93],[-594,121],[-417,4],[-287,-40],[-233,-413],[-354,-255],[-401,-762],[-320,-532],[236,95],[446,756],[583,480]],[[31513,80124],[416,58],[245,-283]],[[32174,79899],[-262,-387],[88,-620],[91,-435],[361,-287],[459,83],[278,647],[19,-417],[180,-209],[-344,-377],[-615,-343],[-276,-233],[-310,-415],[-211,43],[-11,487],[483,476],[-445,-19],[-309,-70]],[[31350,77823],[48,-189],[-296,-279],[-286,-198],[-293,-171]],[[30523,76986],[-159,-376],[-35,-95]],[[30329,76515],[-3,-306],[92,-305],[115,-14],[-29,210],[83,-128],[-22,-165],[-188,-93],[-133,11],[-205,-100],[-121,-29],[-162,-28],[-231,-167],[408,108],[82,-109],[-389,-173],[-177,-1],[8,71],[-84,-160],[82,-26],[-60,-414],[-203,-443],[-20,148],[-61,30],[-91,144],[57,-310]],[[29077,74266],[66,-103],[8,-217]],[[29151,73946],[-89,-224],[-157,-460],[-25,23],[86,392],[-142,220],[-33,478],[-53,-249],[59,-365]],[[28797,73761],[-175,86],[183,-181]],[[28805,73666],[12,-548],[79,-40],[29,-199],[39,-577],[-176,-427],[-288,-171],[-182,-338],[-139,-37],[-141,-211],[-39,-193],[-305,-374],[-157,-274],[-131,-342],[-43,-409],[50,-400],[92,-492],[124,-408],[1,-249],[132,-668],[-9,-388],[-12,-224],[-69,-352],[-83,-73],[-137,70],[-44,253]],[[27408,66595],[-106,132],[-147,496]],[[27155,67223],[-129,440]],[[27026,67663],[-42,226],[57,382]],[[27041,68271],[-77,317],[-217,481]],[[26747,69069],[-108,89],[-281,-262],[-49,29],[-135,269],[-174,142],[-314,-72],[-247,63],[-212,-39]],[[25227,69288],[-118,-81],[54,-162]],[[25163,69045],[-5,-234],[59,-113],[-53,-76],[-103,85],[-104,-109]],[[24957,68598],[-202,18],[-207,304]],[[24548,68920],[-242,-72],[-202,133],[-173,-40],[-234,-135],[-253,-427],[-276,-248],[-152,-275],[-63,-259],[-3,-397],[14,-277],[52,-196]],[[23016,66727],[1,-1],[-1,-1],[-107,-503]],[[22909,66222],[-49,-415],[-20,-771],[-27,-281],[48,-315],[86,-280],[56,-447],[184,-429],[65,-328],[109,-284],[295,-153],[114,-241],[244,161],[212,58],[208,104],[175,99],[176,235],[67,336],[22,483],[48,169],[188,151],[294,133],[246,-20],[169,49],[66,-122],[-9,-278],[-149,-342],[-66,-351],[51,-100],[-42,-249],[-69,-449],[-71,148],[-58,-10]],[[25472,62483],[1,-84],[53,-3],[-5,-157],[-45,-249],[24,-89],[-29,-206],[18,-55],[-32,-291],[-55,-153],[-50,-18],[-55,-199]],[[25297,60979],[90,-105],[24,86],[82,-73]],[[25493,60887],[29,-23],[61,101],[79,9],[26,-47],[43,28],[129,-52],[128,15],[90,64],[32,65],[89,-30],[66,-39],[73,13],[55,50],[127,-80],[44,-13],[85,-107],[80,-129],[101,-88],[73,-159]],[[26903,60465],[-24,-55],[-14,-129],[29,-210],[-64,-197],[-30,-231],[-9,-254],[15,-148],[7,-260],[-43,-56],[-26,-247],[19,-152],[-56,-147],[12,-156],[43,-94]],[[26762,58129],[70,-313],[108,-232],[130,-246]],[[27070,57338],[100,-206],[-6,-122],[111,-26],[26,47],[77,-142],[136,42],[119,145],[168,116]],[[27801,57192],[95,173],[153,-34]],[[28049,57331],[-10,-57],[155,-20],[124,-99],[90,-173]],[[28408,56982],[105,-160],[143,-18]],[[28656,56804],[209,402],[114,62],[3,190],[51,487],[159,267],[175,11],[22,120],[218,-48],[218,291],[109,128],[134,278],[98,-36],[73,-151],[-54,-194]],[[30185,58611],[-8,-136],[-163,-67],[91,-262],[-3,-301],[-123,-334],[105,-457],[120,37],[62,417],[-86,202],[-14,436],[346,234],[-38,272],[97,181],[100,-404],[195,-10],[180,-321],[11,-190]],[[31057,57908],[249,-5],[297,59]],[[31603,57962],[159,-258],[213,-71],[155,180],[4,145],[344,34],[333,8],[-236,-170],[95,-272],[222,-43],[210,-283]],[[33102,57232],[45,-461],[144,13],[109,-136]],[[33400,56648],[183,-212],[171,-375],[8,-297],[105,-13],[149,-281],[109,-201]],[[34125,55269],[333,-115],[30,104],[225,41],[298,-155]],[[35011,55144],[95,-63],[204,-136],[294,-486],[46,-236]],[[35650,54223],[95,27],[69,-318],[155,-1008],[149,-95],[7,-397],[-208,-474],[86,-174],[491,-90]],[[36494,51694],[10,-577],[211,377]],[[36715,51494],[349,-207],[462,-351],[135,-338],[-45,-319],[323,178],[540,-305],[415,23],[411,-477],[355,-645],[214,-166],[237,-23],[101,-182],[94,-733],[46,-348],[-110,-953],[-142,-376],[-391,-801],[-177,-651],[-206,-499],[-69,-11],[-78,-424],[20,-1079],[-77,-888],[-30,-379],[-88,-228],[-49,-769],[-282,-752],[-47,-595]],[[38626,39196],[-225,-249],[-65,-346]],[[38336,38601],[-302,2],[-437,-222],[-195,-256],[-311,-168],[-327,-459],[-235,-571],[-41,-430],[46,-318],[-51,-582],[-63,-281],[-195,-317],[-308,-1013],[-244,-457],[-189,-269],[-127,-548],[-183,-329]],[[35174,32383],[-121,-362],[-313,-320],[-205,115],[-151,-62],[-256,247],[-189,-18]],[[33939,31983],[-169,318],[-19,-300]],[[33751,32001],[353,-493],[-38,-397],[173,-251],[-14,-282],[-267,-738],[-412,-309],[-557,-120],[-305,58],[59,-343],[-57,-431],[51,-291],[-167,-202],[-284,-80],[-267,210],[-108,-151],[39,-572],[188,-173],[152,181],[82,-299],[-255,-179],[-223,-358],[-41,-579],[-66,-309],[-262,-1],[-218,-295],[-80,-432]],[[31227,25165],[274,-422],[265,-116]],[[31766,24627],[-96,-517],[-328,-325],[-180,-675],[-254,-227],[-113,-270],[89,-598],[185,-333],[-117,29]],[[30952,21711],[-247,4],[-134,-141],[-250,-208],[-45,-538],[-118,-14],[-313,188],[-318,401],[-346,329],[-87,365],[79,337],[-140,383],[-36,982],[119,554],[293,445],[-422,168],[265,509],[94,956],[309,-202],[145,1193],[-186,153],[-87,-719],[-175,81],[87,823],[95,1067],[127,394]],[[29661,29221],[-79,562],[-23,649]],[[29559,30432],[117,18],[170,930],[192,922],[118,858],[-64,863],[83,475],[-34,711],[163,703],[50,1114],[89,1196],[87,1287],[-20,943],[-58,811]],[[30452,41263],[-279,331],[-24,236],[-551,578],[-498,630],[-214,355],[-115,476],[46,166],[-236,755],[-274,1063],[-262,1147],[-114,262],[-87,424],[-216,376],[-198,233],[90,257],[-134,550],[86,403],[221,364]],[[27693,49869],[148,430],[-60,251],[-106,-267],[-166,252],[56,163],[-47,522],[97,87],[52,359],[105,371],[-20,235],[153,123],[190,230]],[[28095,52625],[-37,178],[103,44],[-12,288],[65,209],[138,38],[117,362],[106,302],[-102,137],[52,335],[-62,526],[59,152],[-44,487],[-112,306]],[[28366,55989],[-93,167],[-59,310]],[[28214,56466],[68,154],[-70,40],[-52,190],[-138,160],[-122,-37],[-56,-200],[-112,-145],[-61,-20],[-27,-120],[132,-312],[-75,-74],[-40,-85]],[[27661,56017],[-130,-30],[-48,344],[-36,-97]],[[27447,56234],[-92,33],[-56,232],[-114,38],[-72,68],[-119,-1],[-8,-125],[-32,87]],[[26954,56566],[-151,128],[-56,121],[32,100],[-11,127],[-77,138],[-109,113],[-95,74],[-19,168],[-73,103],[18,-167],[-55,-138],[-64,160],[-89,57],[-38,116],[2,175],[36,182],[-78,81],[64,111]],[[26191,58215],[-96,181],[-130,233],[-61,194],[-117,181],[-140,260],[31,89],[46,-87],[21,41]],[[25745,59307],[-48,180],[-84,50]],[[25613,59537],[-31,-135],[-161,8],[-100,55],[-115,115],[-154,36],[-79,123]],[[24973,59739],[-142,101],[-174,10],[-127,114],[-149,238]],[[24381,60202],[-314,620],[-144,187],[-226,150],[-156,-42],[-223,-216],[-140,-57],[-196,152],[-208,109],[-260,264],[-208,81],[-314,268],[-233,275],[-70,154],[-155,34],[-284,183],[-116,262],[-299,327],[-139,363],[-66,281],[93,56],[-29,164],[64,150],[1,199],[-93,259],[-25,229],[-94,290],[-244,573],[-280,450],[-135,359],[-238,235],[-51,140],[42,356],[-142,135],[-164,279],[-69,402],[-149,47]],[[19117,67920],[-162,304],[-130,280]],[[18825,68504],[-12,180],[-149,434],[-99,441],[5,221],[-201,229],[-93,-26],[-159,159],[-44,-234],[46,-276],[27,-433],[95,-237],[206,-397],[46,-135],[42,-41],[37,-198],[49,8],[56,-372],[85,-146],[59,-204],[174,-293],[92,-536],[83,-252],[77,-270],[15,-304],[134,-19],[112,-261],[100,-257]],[[19608,65285],[-6,-103],[-117,-212]],[[19485,64970],[-49,3],[-74,350]],[[19362,65323],[-182,328],[-200,278]],[[18980,65929],[-142,147],[9,421],[-42,312],[-132,179],[-191,257]],[[18482,67245],[-37,-74],[-70,150]],[[18375,67321],[-171,139],[-164,334],[20,44],[115,-33],[103,215],[10,260],[-214,411],[-163,159],[-102,360],[-103,377],[-129,461],[-113,518]],[[17464,70566],[-46,294],[-180,331],[-130,69],[-30,165],[-156,29],[-100,156],[-258,57]],[[16564,71667],[-70,93],[-34,316]],[[16460,72076],[-270,578],[-231,801],[10,133],[-123,190],[-215,483],[-38,469],[-148,315],[61,477],[-10,494]],[[15496,76016],[-89,442],[109,542]],[[15516,77000],[67,1045]],[[15583,78045],[-50,773]],[[15533,78818],[-88,493],[-80,267]],[[15365,79578],[33,112],[402,-195],[148,-544]],[[15948,78951],[68,152],[-44,472]],[[15972,79575],[-94,473]],[[15878,80048],[-38,1],[-537,566],[-199,248],[-503,239],[-155,510],[40,353],[-356,245]],[[14130,82210],[-48,465],[-336,418]],[[13746,83093],[-6,296]],[[13740,83389],[-153,217]],[[13587,83606],[-245,184],[-78,502]],[[13264,84292],[-358,466],[-150,543],[-267,38],[-441,14],[-326,165],[-574,598],[-266,109],[-486,206],[-385,-49],[-546,264],[-330,246],[-309,-122],[58,-400],[-154,-37],[-321,-120],[-245,-195]],[[8164,86018],[-307,-122],[-40,339]],[[7817,86235],[125,565],[295,177],[-76,145],[-354,-321],[-190,-383],[-400,-410],[203,-280],[-262,-413],[-299,-241],[-278,-176],[-69,-255],[-434,-297],[-87,-271],[-325,-246],[-191,44],[-259,-160],[-282,-196],[-231,-193],[-477,-164]],[[4226,83160],[-43,97],[304,269]],[[4487,83526],[271,177],[296,315],[345,65],[137,236],[385,345],[62,115],[205,204],[48,437],[141,340],[-320,-175],[-90,99],[-150,-209],[-181,292],[-75,-207],[-104,287],[-278,-230],[-170,0],[-24,343],[50,211],[-179,205],[-361,-110],[-235,270],[-190,138],[-1,327],[-214,245],[108,331],[226,322],[99,295],[225,42],[191,-92],[224,278],[201,-50],[212,179],[-52,263],[-155,104],[205,222],[-170,-7],[-295,-125],[-85,-127],[-219,127],[-392,-65],[-407,138],[-117,232]],[[3654,89313],[-351,335],[390,240]],[[3693,89888],[620,282],[228,0],[-38,-288],[586,22],[-225,357],[-342,219],[-197,288],[-267,246],[-381,182],[155,302]],[[3832,91498],[493,18],[350,263]],[[4675,91779],[66,280],[284,274],[271,66],[526,256],[256,-39],[427,307],[421,-121],[201,-260],[123,112],[469,-35],[-16,-132],[425,-98],[283,57],[585,-182],[534,-54],[214,-75],[370,94],[421,-173],[302,-81]],[[10837,91975],[518,-139],[438,-277],[289,-53],[244,241]],[[12326,91747],[336,180],[413,-71]],[[13075,91856],[416,253],[455,144],[191,-239],[207,134],[62,272],[192,-62],[470,-516],[369,390],[38,-437],[341,95],[105,168],[337,-33],[424,-242],[650,-211],[383,-98],[272,37]],[[17987,91511],[375,-292],[-391,-286]],[[17971,90933],[502,-123],[750,68],[236,100],[296,-345],[302,291],[-283,245],[179,197],[338,26],[223,58],[224,-138],[279,-312],[310,46],[491,-260],[431,91],[405,-13],[-32,358]],[[22622,91222],[247,101],[431,-196]],[[23300,91127],[-2,-545],[177,459],[223,-15],[126,579],[-298,355],[-324,233],[22,636],[329,418],[366,-92],[281,-255],[378,-649],[-247,-283],[517,-116],[-1,-589],[371,451],[332,-371],[-83,-427],[269,-388],[290,416],[202,497],[16,632],[394,-44],[411,-85],[373,-286],[17,-285],[-207,-307],[196,-309],[-36,-280]],[[19722,91438],[-824,-101],[-374,-39]],[[18524,91298],[-151,271],[-379,157],[-246,-64],[-343,456],[185,61],[429,99],[392,-26],[362,100],[-537,135],[-594,-46],[-394,11],[-146,213],[644,230],[-428,-8],[-485,152],[233,431],[193,229],[744,351],[284,-111],[-139,-270],[618,174],[386,-291],[314,294],[254,-188],[227,-566],[140,238],[-197,590],[244,85],[276,-93],[311,-232],[175,-561],[86,-406],[466,-285],[502,-273],[-31,-253],[-456,-47],[178,-221],[-94,-211],[-503,90],[-478,156],[-322,-35],[-522,-196]],[[20972,94111],[-244,-381],[-434,404],[95,80],[372,23],[211,-126]],[[28794,93928],[25,-159],[-296,16],[-299,13],[-304,-78],[-80,35],[-306,306],[12,207],[133,38],[636,-62],[479,-316]],[[25955,93959],[219,-359],[256,465],[704,236],[477,-596],[-42,-377],[550,168],[263,228],[616,-291],[383,-274],[36,-252],[515,131],[290,-367],[670,-228],[242,-232],[263,-539],[-510,-268],[654,-376],[441,-127],[400,-529],[437,-38],[-87,-404],[-487,-669],[-342,246],[-437,554],[-359,-72],[-35,-330],[292,-335],[377,-265],[114,-153],[181,-570],[-96,-414],[-350,156],[-697,461],[393,-496],[289,-348],[45,-201],[-753,230],[-596,334],[-337,281],[97,162],[-414,296],[-405,280],[5,-167],[-803,-92],[-235,198],[183,424],[522,10],[571,74],[-92,205],[96,287],[360,561],[-77,255],[-107,197],[-425,280],[-563,196],[178,145],[-294,358],[-245,33],[-219,196],[-149,-170],[-503,-74],[-1011,129],[-588,169],[-450,87],[-231,202],[290,263],[-394,2],[-88,583],[213,515],[286,235],[717,154],[-204,-373]],[[22123,94355],[331,-122],[496,73],[72,-167],[-259,-276],[420,-248],[-50,-518],[-455,-223],[-268,48],[-192,220],[-690,444],[5,185],[567,-72],[-306,377],[329,279]],[[89889,93991],[-421,-4],[-569,64],[-49,31],[263,227],[348,54],[394,-221],[34,-151]],[[24112,93737],[-298,-430],[-317,21],[-173,506],[4,287],[145,244],[276,157],[579,-20],[530,-140],[-415,-513],[-331,-112]],[[15808,92660],[-147,253],[-641,304]],[[15020,93217],[93,188],[218,477]],[[15331,93882],[241,378],[-272,353],[939,90],[397,-119],[709,-32],[270,-167],[298,-243],[-349,-145],[-681,-405],[-344,-403]],[[16539,93189],[0,-242],[-731,-287]],[[91869,95069],[-321,-228],[-444,52],[-516,227],[66,187],[518,-87],[697,-151]],[[23996,95009],[-151,-223],[-403,43],[-337,150],[148,259],[399,155],[243,-202],[101,-182]],[[90301,95344],[-219,-427],[-1023,16],[-461,-136],[-550,374],[149,396],[366,108],[734,-25],[1004,-306]],[[22639,96011],[212,-267],[9,-295],[-127,-429],[-458,-59],[-298,92],[5,336],[-455,-44],[-18,445],[299,-18],[419,197],[390,-34],[22,76]],[[19941,95712],[109,-205],[247,97],[291,-25],[49,-282],[-169,-274],[-940,-89],[-701,-249],[-423,-13],[-35,187],[577,255],[-1255,-69],[-389,103],[379,563],[262,161],[782,-194],[493,-341],[485,-44],[-397,551],[255,210],[286,-67],[94,-275]],[[65981,92556],[-164,-51],[-907,75],[-74,256],[-503,154],[-40,311],[284,124],[-10,314],[551,491],[-255,70],[665,506],[-75,261],[621,304],[917,370],[925,108],[475,214],[541,74],[193,-227],[-187,-179],[-984,-286],[-848,-274],[-863,-548],[-414,-563],[-435,-553],[56,-479],[531,-472]],[[23699,96229],[308,-186],[547,2],[240,-190],[-64,-216],[319,-130],[177,-137],[374,-26],[406,-48],[441,125],[566,49],[451,-40],[298,-218],[62,-238],[-174,-153],[-414,-124],[-355,70],[-797,-88],[-570,-11],[-449,71],[-738,186],[-96,316],[-34,286],[-279,251],[-574,70],[-322,179],[104,236],[573,-36]],[[17722,96544],[-38,-443],[-214,-199],[-259,-29],[-517,-246],[-444,-88],[-377,124],[472,431],[570,373],[426,-8],[381,85]],[[0,89247],[99640,-253],[-360,42],[250,-307],[166,-474],[128,-155],[32,-238],[-71,-153],[-518,126],[-777,-434],[-247,-67],[-425,-405],[-403,-353],[-102,-262]],[[97313,86314],[-397,398],[-724,-451],[-126,213]],[[96066,86474],[-268,-246],[-371,79],[-90,-379],[-333,-557],[10,-233],[316,-129],[-37,-839],[-258,-21],[-119,-482],[116,-248],[-486,-294],[-96,-657],[-415,-141],[-83,-585],[-400,-536],[-103,396],[-119,841],[-155,1279],[134,799],[234,344]],[[93543,84865],[15,269],[431,129]],[[93989,85263],[496,725],[479,592],[499,459],[223,812]],[[95686,87851],[-337,-48],[-167,-475]],[[95182,87328],[-705,-632],[-227,708],[-717,-196],[-696,-965],[230,-353],[-620,-151],[-430,-59],[20,417],[-431,87],[-344,-283],[-850,99]],[[90412,86000],[-913,-171],[-900,-1124]],[[88599,84705],[-1065,-1358]],[[87534,83347],[438,-72],[136,-361]],[[88108,82914],[270,-128],[178,288],[305,-38],[401,-633],[9,-490],[-217,-576],[-23,-687],[-126,-921],[-418,-833],[-94,-399],[-377,-670],[-374,-665],[-179,-340],[-370,-338],[-175,-8],[-175,280],[-373,-421],[-43,-192]],[[86327,76143],[-106,35],[-120,-195],[-83,-196],[10,-414],[-143,-127],[-50,-102],[-104,-170],[-185,-95],[-121,-154],[-9,-250],[-32,-63],[111,-94],[157,-253]],[[85652,74065],[240,-679],[68,-373],[3,-664],[-105,-316],[-252,-111],[-222,-239],[-250,-49]],[[85134,71634],[-31,314],[52,431],[-123,600]],[[85032,72979],[206,97],[-190,493]],[[85048,73569],[-135,109],[-34,-108],[-81,-48],[-10,109],[-72,52],[-75,92]],[[84641,73775],[77,254],[65,67]],[[84783,74096],[-25,106],[71,310]],[[84829,74512],[-18,94],[-163,63],[-131,154]],[[84517,74823],[-388,-167],[-204,-269],[-300,-157],[148,267],[-58,224],[220,387],[-147,302],[-242,-204],[-314,-400],[-171,-372],[-272,-28],[-142,-268],[147,-390],[227,-94],[9,-259],[220,-168],[311,411],[247,-224],[179,-15]],[[83987,73399],[46,-302],[-394,-161]],[[83639,72936],[-130,-311],[-270,-289],[-142,-403],[299,-316],[109,-567],[169,-527],[189,-443],[-5,-428],[-174,-157],[66,-307],[164,-179],[-43,-469],[-71,-456],[-155,-52],[-203,-623],[-225,-756],[-258,-687],[-382,-532],[-386,-484],[-313,-67],[-170,-255],[-96,186],[-157,-286],[-388,-288],[-294,-88],[-95,-609],[-154,-33],[-73,418],[66,222],[-373,185],[-131,-94]],[[80013,64241],[-371,-493],[-231,-544],[-61,-399],[212,-607],[260,-753],[252,-356],[169,-462],[127,-1066],[-37,-1013],[-232,-379],[-318,-371],[-227,-480],[-346,-536],[-101,369],[78,390],[-206,327]],[[78981,57868],[-233,84],[-112,301],[-141,594]],[[78495,58847],[-249,265],[-238,-11],[41,452],[-245,-3],[-22,-633],[-150,-841],[-90,-509],[19,-417],[181,-18],[113,-526],[50,-498],[155,-330],[168,-67],[144,-299]],[[78372,55412],[64,-54],[164,-347],[116,-386],[16,-388],[-29,-262],[27,-198],[20,-340],[98,-159],[109,-509],[-5,-195],[-197,-38],[-263,426],[-329,457],[-32,294],[-161,385],[-38,477],[-100,314],[30,419],[-61,244]],[[77801,55552],[-110,221],[-47,285],[-148,325],[-135,274],[-45,-339],[-53,320],[30,359],[82,553]],[[77375,57550],[-27,427],[86,441],[-94,341],[23,627],[-113,299],[-90,689],[-50,727],[-121,477]],[[76989,61578],[-183,-288],[-315,-411]],[[76491,60879],[-156,51],[-172,135],[96,714],[-58,539],[-218,664],[34,208],[-163,74],[-197,469]],[[75657,63733],[-79,301],[-16,293],[-53,277],[-116,335],[-256,23],[25,-237]],[[75162,64725],[-87,-320],[-118,116]],[[74957,64521],[-41,-105],[-78,63],[-108,52]],[[74730,64531],[-39,-210],[-189,7],[-343,-120],[16,-433],[-148,-341],[-400,-387],[-311,-678],[-209,-363],[-276,-377],[-1,-265],[-138,-142]],[[72692,61222],[-250,-206],[-130,-31]],[[72312,60985],[-84,-439],[58,-749],[15,-478],[-118,-547],[-1,-978],[-144,-28],[-126,-439],[84,-190],[-253,-163],[-93,-392],[-112,-165],[-263,537],[-128,807],[-107,581],[-97,272],[-148,553],[-69,720],[-48,360],[-253,791],[-115,1116],[-83,737],[1,698],[-54,539],[-404,-345],[-196,69],[-362,698],[133,208],[-82,226],[-326,489]],[[68937,65473],[-203,146],[-83,414],[-215,438],[-512,-108],[-451,-11],[-391,-81]],[[67082,66271],[-523,174]],[[66559,66445],[-302,133],[-314,74]],[[65943,66652],[-118,707],[-133,102],[-214,-103],[-280,-279],[-339,191],[-281,443],[-267,164],[-186,546],[-205,768],[-149,-93],[-177,190]],[[63594,69288],[-103,-224],[-165,28]],[[63326,69092],[58,-254],[-25,-132],[89,-434]],[[63448,68272],[109,-497],[137,-131]],[[63694,67644],[47,-202],[190,-243]],[[63931,67199],[16,-237],[-27,-192],[35,-193],[80,-162],[37,-189],[41,-141]],[[64113,66085],[-18,419],[75,302],[76,62],[84,-180],[5,-337],[-61,-339]],[[64274,66012],[53,-220]],[[64327,65792],[49,28],[11,-158],[217,91],[230,-15],[168,-17],[190,389],[207,369],[176,355]],[[65575,66834],[80,196],[35,-50],[-26,-238],[-37,-104]],[[65627,66638],[38,-455]],[[65665,66183],[125,-393],[155,-209]],[[65945,65581],[204,-76],[164,-105]],[[66313,65400],[125,-330],[75,-191],[100,-73],[-1,-128],[-101,-344],[-44,-161],[-117,-184],[-104,-395],[-126,30],[-58,-137],[-44,-292],[34,-385],[-26,-71],[-128,2],[-174,-215],[-27,-281],[-63,-121]],[[65634,62124],[-173,5],[-109,-146]],[[65352,61983],[1,-232],[-134,-160],[-153,54],[-186,-194],[-128,-33]],[[64752,61418],[-201,-154],[-54,-256],[-6,-196],[-277,-244],[-444,-268],[-249,-406],[-122,-32],[-83,34],[-163,-239],[-177,-111],[-233,-30],[-70,-33],[-61,-152],[-73,-42]],[[62539,59289],[-42,-146],[-138,13],[-89,-79]],[[62270,59077],[-192,30],[-72,336],[8,315],[-46,170],[-54,426],[-80,236],[56,28],[-29,264],[34,111],[-12,251]],[[61883,61244],[-36,246],[-84,173]],[[61763,61663],[-22,230],[-143,206],[-148,483],[-79,469],[-192,397],[-124,94],[-184,549],[-32,400],[12,342],[-159,638],[-130,225],[-150,119],[-92,330],[15,130],[-77,299],[-81,128],[-108,429],[-170,464]],[[59899,67595],[-141,396],[-139,-3]],[[59619,67988],[44,316],[12,201],[34,230]],[[59709,68735],[-9,84]],[[59700,68819],[-78,-232],[-60,-435],[-75,-300],[-65,-100],[-93,186],[-125,257],[-198,825],[-29,-52],[115,-608],[171,-579],[210,-897],[102,-313],[90,-325],[249,-638],[-55,-100],[9,-374],[323,-517],[49,-118]],[[60240,64499],[90,-565],[-61,-105],[40,-593],[102,-687],[106,-142],[152,-213]],[[60669,62194],[161,-666],[77,-529],[152,-281],[379,-544],[154,-328],[151,-332],[87,-198],[136,-173]],[[61966,59143],[66,-178],[-9,-240],[-158,-137],[119,-158]],[[61984,58430],[91,-106],[54,-238],[125,-241],[138,-2],[262,147],[302,68],[245,179],[138,38],[99,105]],[[63438,58380],[158,21],[89,11]],[[63685,58412],[128,85],[147,58],[132,198],[105,1],[6,-159],[-25,-335],[1,-303],[-59,-208],[-78,-622],[-134,-644],[-172,-735],[-238,-844],[-237,-645],[-327,-785]],[[62934,53474],[-278,-466],[-415,-572]],[[62241,52436],[-259,-438],[-304,-698],[-64,-304],[-63,-136]],[[61551,50860],[-195,-230],[-68,-240],[-104,-42],[-40,-406],[-89,-233],[-54,-383],[-112,-190]],[[60889,49136],[-128,-709],[16,-327]],[[60777,48100],[178,-210],[8,-149],[-76,-348],[16,-175],[-18,-275],[97,-361],[115,-568],[101,-126]],[[61198,45888],[45,-258],[-11,-574],[34,-505],[11,-900],[49,-282],[-83,-412],[-108,-400],[-177,-357],[-254,-219],[-313,-279],[-313,-618],[-107,-106],[-194,-409],[-115,-133],[-23,-411],[132,-436],[54,-337],[4,-173],[49,29],[-8,-565],[-45,-267],[65,-99],[-41,-239],[-116,-205],[-229,-195],[-334,-312],[-122,-213],[24,-242],[71,-39],[-24,-303]],[[59119,36429],[-70,-419],[-32,-479],[-72,-260],[-190,-290],[-54,-84],[-118,-292],[-77,-296],[-158,-413],[-314,-594],[-196,-345]],[[57838,32957],[-209,-262],[-291,-224]],[[57338,32471],[-141,-30],[-36,-160],[-169,85],[-138,-109],[-301,111]],[[56553,32368],[-168,-70],[-115,30]],[[56270,32328],[-286,-228],[-238,-91],[-171,-218],[-127,-13],[-117,205]],[[55331,31983],[-94,11],[-120,257]],[[55117,32251],[-13,-80],[-37,155],[2,337],[-90,386],[89,105],[-7,442],[-182,539],[-139,488],[-1,1],[-199,749]],[[54540,35373],[-207,435],[-108,420],[-62,561],[-68,417],[-93,887],[-7,689],[-35,314],[-108,237],[-144,476],[-146,691],[-60,361],[-226,563],[-17,441]],[[53259,41865],[-26,363],[38,506],[96,527],[15,247],[90,519],[66,236],[159,377]],[[53697,44640],[90,257],[29,426]],[[53816,45323],[-15,326],[-83,206],[-74,350],[-68,345],[15,120],[85,228],[-84,557],[-57,385]],[[53535,47840],[-139,365],[26,111]],[[53422,48316],[-39,179]],[[53383,48495],[-74,433]],[[53309,48928],[-228,610]],[[53081,49538],[-285,581],[-184,475],[-169,595],[9,192],[61,184],[67,419],[56,427]],[[52636,52411],[-52,87],[96,647]],[[52680,53145],[40,454],[-108,381],[-127,98],[-56,258]],[[52429,54336],[-71,82],[3,159]],[[52361,54577],[-289,-207],[-105,30],[-107,-129],[-222,13],[-149,360],[-91,417],[-197,379],[-209,-7],[-245,1]],[[50747,55434],[-229,-67],[-224,-123]],[[50294,55244],[-436,-337],[-154,-198],[-250,-167],[-248,164]],[[49206,54706],[-126,-6],[-194,112],[-178,-6],[-329,-101],[-193,-166],[-275,-211],[-54,15]],[[47857,54343],[-73,-5],[-286,274],[-252,439],[-237,315],[-187,371]],[[46822,55737],[-75,43],[-200,232],[-144,308],[-49,211],[-34,425]],[[46320,56956],[-122,341],[-108,226],[-71,74],[-69,115],[-32,254],[-41,127],[-80,94]],[[45797,58187],[-149,241],[-117,38],[-63,162],[1,88],[-84,122],[-18,124]],[[45367,58962],[-46,441]],[[45321,59403],[36,255]],[[45357,59658],[-115,449],[-138,205],[122,109],[134,404],[66,296]],[[45426,61121],[-24,311]],[[45402,61432],[78,284],[34,542]],[[45514,62258],[-30,569],[-34,286],[28,287],[-72,274],[-146,249]],[[45260,63923],[12,243]],[[45272,64166],[13,267],[106,157],[91,300],[-18,195],[96,406],[155,366],[93,93],[74,336],[6,307],[100,356],[185,210],[177,588]],[[46350,67747],[144,229]],[[46494,67976],[259,64]],[[46753,68040],[219,393],[139,154]],[[47111,68587],[232,481],[-70,716],[106,495],[37,304],[179,389],[278,263],[206,238],[186,596],[87,354],[205,-3],[167,-244],[264,39],[288,-127],[121,-6]],[[49397,72082],[267,315],[300,100],[175,238],[268,175],[471,102],[459,47],[140,-85],[262,227],[297,4],[113,-134],[190,35]],[[52339,73106],[302,233],[195,-70]],[[52836,73269],[-9,-291],[236,212],[20,-111],[-139,-282],[-2,-266],[96,-143],[-36,-499],[-183,-289],[53,-314],[143,-10],[70,-274],[106,-90]],[[53191,70912],[326,-198],[117,50],[232,-96],[368,-258],[130,-512],[250,-111],[391,-242],[296,-286],[136,150]],[[55437,69409],[133,265],[-65,441]],[[55505,70115],[87,280],[200,270],[192,78],[375,-118],[95,-257],[104,-3],[88,-98],[276,-67],[68,-191]],[[56990,70009],[369,10],[268,-152]],[[57627,69867],[275,-170],[129,-90]],[[58031,69607],[214,182],[114,165],[245,48],[198,-73],[75,-286],[65,189],[222,-136],[217,-33],[137,145]],[[59518,69808],[80,190],[-19,32]],[[59579,70030],[74,269],[56,435]],[[59709,70734],[40,146],[8,6]],[[59757,70886],[99,469],[138,406],[5,20]],[[59999,71781],[-26,440],[68,237]],[[60041,72458],[-102,261],[105,217],[-169,-49],[-233,132],[-191,-331],[-421,-65],[-225,309],[-300,19],[-64,-238],[-192,-69],[-268,307],[-303,-11],[-165,573],[-203,320]],[[57310,73833],[135,448],[-176,275]],[[57269,74556],[308,551],[428,23],[117,437]],[[58122,75567],[529,-76]],[[58651,75491],[334,374],[324,162]],[[59309,76027],[459,13],[485,-406],[399,-223],[323,89],[239,-52],[328,301]],[[61542,75749],[42,246],[-70,393],[-160,212],[-154,66],[-102,177]],[[61098,76843],[-354,486],[-317,218],[-240,338],[202,92],[231,482]],[[60620,78459],[-156,228],[410,234],[-8,126]],[[60866,79047],[-249,-92]],[[60617,78955],[-222,-46],[-185,-187],[-260,-30],[-239,-215],[16,-358],[136,-139],[284,35],[-55,-206]],[[60092,77809],[-304,-99],[-377,-334]],[[59411,77376],[-154,117],[61,271],[-304,169],[50,110],[265,191],[-80,132],[-432,146],[-19,215],[-257,-71],[-103,-317],[-215,-426]],[[58223,77913],[6,-149]],[[58229,77764],[-135,-123],[-84,53]],[[58010,77694],[-78,-694]],[[57932,77000],[-144,-239],[-101,-412],[89,-328]],[[57776,76021],[33,-222],[243,-186],[-51,-141],[-330,-32],[-118,-178],[-232,-310],[-87,268],[3,119]],[[57237,75339],[-169,17],[-145,54],[-336,-150],[192,-323],[-141,-94],[-154,-1],[-147,297],[-52,-127],[62,-344],[139,-270],[-105,-126],[155,-265],[137,-167],[4,-326],[-257,153],[82,-294],[-176,-60],[105,-509],[-184,-7],[-228,251],[-104,460],[-49,384],[-108,264],[-143,329],[-18,164]],[[55597,74649],[-48,40],[-5,127],[-154,193],[-24,274],[23,393],[38,179]],[[55427,75855],[-46,91],[-59,44]],[[55322,75990],[-78,188],[-120,115]],[[55124,76293],[-261,213],[-161,207],[-254,171],[-233,424],[56,43],[-127,242],[-5,195],[-179,91],[-85,-249],[-82,193],[6,200],[10,9]],[[53809,78032],[62,52]],[[53871,78084],[-221,84],[-226,-204],[15,-286],[-34,-164],[91,-293],[261,-290],[140,-476]],[[53897,76455],[309,-465],[217,4]],[[54423,75994],[68,-127],[-78,-115],[249,-208],[204,-174],[238,-301],[29,-107],[-52,-206]],[[55081,74756],[-154,269],[-242,94]],[[54685,75119],[-116,-372],[200,-214],[-33,-300],[-116,-34],[-148,-494],[-116,-45],[1,176],[57,309],[60,123],[-108,334],[-85,290],[-115,72],[-82,249]],[[54084,75213],[-179,105],[-120,231]],[[53785,75549],[-206,37],[-217,260],[-254,375],[-189,332],[-86,569],[-138,67],[-226,190],[-128,-78],[-161,-267],[-115,-42]],[[52065,76992],[-252,-326],[-548,156],[-404,-186],[-32,-347]],[[50829,76289],[15,-335],[-263,-383],[-356,-122],[-25,-194],[-171,-319],[-107,-469],[108,-329],[-160,-257],[-60,-374],[-210,-115],[-197,-443]],[[49403,72949],[-352,-9],[-265,11]],[[48786,72951],[-174,-203],[-106,-218],[-136,48],[-103,195],[-79,331],[-259,89]],[[47929,73193],[-112,-149],[-146,81],[-143,-64],[42,451],[-26,354],[-124,53]],[[47420,73919],[-67,219],[22,376]],[[47375,74514],[111,210],[20,232],[58,347],[-6,244],[-56,206],[-12,195]],[[47490,75948],[14,410],[-114,250],[393,415],[340,-104],[373,4],[296,-98],[230,30],[449,-19]],[[49471,76836],[144,345],[53,1147],[-287,605],[-205,291],[-424,222],[-28,420],[360,125],[466,-148],[-88,652],[263,-247],[646,449],[84,472],[243,116]],[[50698,81285],[222,113]],[[50920,81398],[143,159],[244,847],[380,241],[231,-16]],[[51918,82629],[54,122],[232,31],[52,-127],[188,284],[-63,216],[-13,326]],[[52368,83481],[-113,320],[-8,589],[46,155],[80,173],[244,36]],[[52617,84754],[98,158],[223,163]],[[52938,85075],[-9,-296],[-82,-188],[33,-161],[151,-87],[-68,-217],[-83,62]],[[52880,84188],[-200,-414],[76,-281]],[[52756,83493],[4,-222],[281,-135],[-3,-204],[283,108],[156,158],[313,-228],[132,-183]],[[53922,82787],[189,169]],[[54111,82956],[434,267],[350,194]],[[54895,83417],[277,-97],[21,-140],[268,-8]],[[55461,83172],[63,254]],[[55524,83426],[383,187],[-59,484]],[[55848,84097],[10,433],[136,362],[262,196],[221,-430],[223,11]],[[56700,84669],[53,443],[32,339]],[[56785,85451],[-102,-72],[-176,204],[-24,331],[351,161],[350,83],[301,-95],[287,17]],[[57772,86080],[316,318],[-291,274]],[[57797,86672],[-504,-46],[-489,-211],[-452,-121],[-161,314],[-269,189],[62,567],[-135,520],[133,335],[252,362],[635,624],[185,121],[-28,243],[-387,272]],[[56639,89841],[-478,-163],[-269,-401],[43,-353],[-441,-463],[-537,-495],[-202,-811],[198,-406],[265,-320],[-255,-649],[-289,-135],[-106,-967],[-157,-539],[-337,55],[-158,-456],[-321,-27],[-89,545],[-232,653],[-211,814]],[[53063,85723],[-187,354],[-548,-666]],[[52328,85411],[-370,-135],[-385,293]],[[51573,85569],[-99,619],[-88,1329],[256,371],[733,483],[549,595],[508,802],[668,1112],[465,434],[763,722],[610,252],[457,-31],[423,477],[506,-25],[499,115],[869,-422],[-358,-154],[305,-361]],[[58639,91887],[286,200],[456,-348],[761,-137],[1050,-652],[213,-273],[18,-384],[-308,-302],[-454,-154],[-1240,438],[-204,-73],[453,-422]],[[59670,89780],[36,-856]],[[59706,88924],[358,-175],[217,-150],[36,279]],[[60317,88878],[-174,257],[183,209]],[[60326,89344],[672,-358]],[[60998,88986],[234,140],[-187,422]],[[61045,89548],[647,564],[256,-33],[260,-202],[161,396],[-231,343],[136,345],[-204,357],[777,-185],[158,-322],[-351,-71]],[[62654,90740],[2,-321],[218,-197]],[[62874,90222],[429,125],[68,367]],[[63371,90714],[581,275],[969,494]],[[64921,91483],[209,-28],[-273,-350],[344,-60],[199,197],[521,16],[412,239],[317,-347],[315,381],[-291,334],[145,190],[820,-175],[385,-180],[1006,-658],[186,302],[-282,304],[-8,122],[-335,57],[92,273],[-149,449],[-8,185],[512,521]],[[69038,93255],[182,524],[207,113]],[[69427,93892],[735,-152],[58,-320]],[[70220,93420],[-263,-467],[173,-184]],[[70130,92769],[89,-403],[-63,-789],[307,-353],[-120,-384],[-544,-818],[318,-85],[110,207],[306,148],[74,285],[240,274],[-162,328],[130,380],[-304,47],[-67,321],[222,578],[-361,469],[497,389],[-64,409],[139,13],[145,-319],[-109,-556],[297,-105],[-127,415],[465,227],[577,30],[513,-328],[-247,479],[-28,614]],[[72363,94242],[484,116],[668,-25]],[[73515,94333],[602,75],[-226,301]],[[73891,94709],[321,379],[319,15]],[[74531,95103],[540,286],[734,77]],[[75805,95466],[93,158],[729,53]],[[76627,95677],[227,-129],[624,306],[510,-10],[77,249],[265,245],[656,236],[476,-186],[-378,-142],[629,-89],[75,-284],[254,140],[812,-8],[626,-281],[223,-215],[-69,-300],[-307,-170],[-730,-320],[-209,-171],[345,-80],[410,-146]],[[81143,94322],[250,109],[142,-369]],[[81535,94062],[122,149],[444,91],[892,-95],[67,-269],[1162,-86],[15,440],[590,-101],[443,3],[449,-303],[128,-369],[-165,-241],[349,-453],[437,-234],[268,605],[446,-260],[473,155],[538,-177],[204,162],[455,-81]],[[88852,92998],[-201,535],[367,249]],[[89018,93782],[2509,-374],[236,-342],[727,-440],[1122,109],[553,-95],[231,-238],[-33,-421],[342,-164],[372,118],[492,15],[525,-113],[526,64],[484,-512],[344,184],[-224,368],[123,256],[886,-161],[578,34]],[[98811,92070],[799,-274],[-99610,-252]],[[0,91544],[0,-2297]],[[63641,75603],[141,-409],[130,-26]],[[63912,75168],[85,-156],[-228,-46],[-49,-447]],[[63720,74519],[-47,-202],[-102,-135]],[[63571,74182],[7,-285]],[[63578,73897],[88,-424],[263,-120],[193,-289],[395,-100],[434,153],[27,134]],[[64978,73251],[-52,408],[40,602],[-216,195],[71,394],[-184,34],[61,485],[262,-141],[244,184],[-202,346],[-80,329],[-224,-147],[-28,-422],[-87,374]],[[64583,75892],[-15,140],[68,240],[-53,201],[-322,196],[-125,517],[-154,146],[-9,187],[270,-54],[11,421],[236,93],[243,-86],[50,562],[-50,356],[-278,-28],[-236,141],[-321,-253],[-259,-121]],[[63639,78550],[-127,-342],[-269,-95],[-276,-594],[252,-547]],[[63219,76972],[-27,-387],[303,-679]],[[63495,75906],[146,-303]],[[23933,96472],[-126,-17],[-521,37],[-74,161],[559,-9],[195,-107],[-33,-65]],[[19392,96574],[-518,-166],[-411,186],[224,183],[406,59],[392,-90],[-93,-172]],[[56867,96664],[-620,-236],[-490,134],[191,149],[-167,184],[575,115],[110,-216],[401,-130]],[[19538,97095],[-339,-113],[-461,1],[5,82],[285,173],[149,-27],[361,-116]],[[23380,96781],[-411,-119],[-226,134],[-119,216],[-22,238],[360,-23],[162,-38],[332,-200],[-76,-208]],[[22205,96935],[108,-240],[-453,64],[-457,187],[-619,21],[268,171],[-335,139],[-21,221],[546,-79],[751,-210],[212,-274]],[[79187,96925],[-1566,-222],[507,756],[229,64],[208,-37],[704,-327],[-82,-234]],[[55069,97728],[915,-429],[-699,-227],[-155,-424],[-243,-108],[-132,-478],[-335,-22],[-598,351],[252,205],[-416,166],[-541,487],[-216,451],[757,206],[152,-202],[396,8],[105,197],[408,20],[350,-201]],[[57068,98134],[545,-202],[-412,-310],[-806,-68],[-819,96],[-50,159],[-398,10],[-304,264],[858,161],[403,-138],[281,172],[702,-144]],[[64204,98215],[-373,-76],[-250,-44],[-39,-94],[-324,-95],[-301,136],[158,180],[-618,17],[542,105],[422,7],[57,-155],[159,138],[262,95],[412,-126],[-107,-88]],[[77760,97255],[-606,-71],[-773,166],[-462,220],[-213,413],[-379,113],[722,394],[600,130],[540,-290],[640,-557],[-69,-518]],[[25828,97704],[334,-186],[-381,-171],[-513,-434],[-492,-41],[-575,74],[-299,235],[4,208],[220,154],[-508,-5],[-306,192],[-176,261],[193,256],[192,175],[285,41],[-122,132],[646,29],[355,-308],[468,-123],[455,-109],[220,-380]],[[30972,99689],[742,-45],[597,-74],[508,-156],[-12,-154],[-678,-250],[-672,-117],[-251,-129],[605,3],[-656,-349],[-452,-163],[-476,-470],[-573,-96],[-177,-117],[-841,-62],[383,-72],[-192,-103],[230,-284],[-264,-198],[-429,-163],[-132,-225],[-388,-172],[39,-130],[475,22],[6,-141],[-742,-345],[-726,159],[-816,-89],[-414,69],[-525,30],[-35,277],[514,130],[-137,415],[170,41],[742,-249],[-379,370],[-450,110],[225,223],[492,137],[79,201],[-392,225],[-118,297],[759,-25],[220,-63],[433,210],[-625,67],[-972,-37],[-491,196],[-232,232],[-324,169],[-61,197],[413,110],[324,18],[545,94],[409,214],[344,-30],[300,-161],[211,311],[367,92],[498,64],[849,24],[148,-63],[802,98],[601,-37],[602,-36]],[[42472,99927],[1737,-457],[-513,-222],[-1062,-25],[-1496,-56],[140,-103],[984,63],[836,-198],[540,176],[231,-206],[-305,-335],[707,214],[1348,223],[833,-111],[156,-246],[-1132,-410],[-157,-133],[-888,-99],[643,-28],[-324,-420],[-224,-373],[9,-641],[333,-376],[-434,-24],[-457,-182],[513,-305],[65,-490],[-297,-53],[360,-495],[-617,-42],[322,-234],[-91,-203],[-391,-89],[-388,-2],[348,-390],[4,-256],[-549,238],[-143,-154],[375,-144],[364,-352],[105,-464],[-495,-111],[-214,222],[-344,331],[95,-391],[-322,-303],[732,-24],[383,-31],[-745,-502],[-755,-454],[-813,-199],[-306,-2],[-288,-222],[-386,-608],[-597,-404],[-192,-23],[-370,-142],[-399,-134],[-238,-357],[-4,-403],[-141,-378],[-453,-461],[112,-450],[-125,-476],[-142,-563],[-391,-35],[-410,471],[-556,3],[-269,315],[-186,563],[-481,716],[-141,375],[-38,517],[-384,532],[100,424],[-186,203],[275,673],[418,214],[110,241],[58,450],[-318,-204],[-151,-85],[-249,-83],[-341,188],[-19,392],[109,306],[258,8],[567,-153],[-478,366],[-249,197],[-276,-81],[-232,143],[310,536],[-169,215],[-220,398],[-335,611],[-353,223],[3,241],[-745,337],[-590,42],[-743,-23],[-677,-42],[-323,183],[-482,362],[729,181],[559,31],[-1188,149],[-627,236],[39,223],[1051,277],[1018,277],[107,210],[-750,206],[243,230],[961,402],[404,62],[-115,258],[658,152],[854,90],[853,6],[303,-180],[737,317],[663,-215],[390,-45],[577,-188],[-660,311],[38,246],[932,344],[975,-26],[354,213],[982,55],[2219,-72]],[[67002,72360],[284,-219],[209,77],[58,261],[219,87],[157,175],[55,460],[234,112],[44,205],[131,-154],[84,-18]],[[68477,73346],[154,-4],[210,-122]],[[68841,73220],[85,-70],[201,185],[93,-111],[90,264],[166,-12],[43,84],[29,233],[120,200],[150,-131],[-30,-176],[84,-27],[-26,-484],[110,-189],[97,121],[123,57],[173,258],[192,-42],[286,-1]],[[70827,73379],[50,-165]],[[70877,73214],[-162,-65],[-141,-106],[-319,-67],[-298,-121],[-163,-251],[66,-244],[32,-287],[-139,-242],[12,-221],[-76,-207],[-265,18],[110,-381],[-177,-146],[-118,-347],[15,-346],[-108,-162],[-103,53],[-212,-75],[-31,-161],[-207,1],[-154,-326],[-10,-490],[-361,-239],[-194,50],[-56,-126],[-166,74],[-278,-87],[-465,294]],[[66909,69007],[252,523],[-23,370],[-210,97],[-22,366],[-91,460],[119,315],[-121,85],[76,419],[113,718]],[[56642,45537],[29,-179],[-32,-279],[49,-270],[-41,-216],[24,-199],[-579,7],[-13,-1832],[188,-471],[181,-360]],[[56448,41738],[-510,-235],[-673,82],[-192,276],[-1126,-25],[-42,-40],[-166,260],[-180,17],[-166,-98],[-134,-110]],[[53697,44640],[90,256],[29,427]],[[53535,47840],[-139,364],[26,112]],[[53422,48316],[115,78],[80,-11],[98,69],[820,-7],[68,-430],[80,-345],[64,-186],[106,-301],[184,46],[91,81],[154,-81],[42,144],[69,336],[172,22],[15,100],[142,2],[-24,-207],[337,5],[5,-363],[56,-222],[-41,-347],[21,-354],[93,-214],[-15,-685],[68,53],[121,-15],[172,87],[127,-34]],[[53309,48928],[112,249],[84,97],[104,-198]],[[53609,49076],[-101,-121],[-45,-148],[-9,-251],[-71,-61]],[[55719,75933],[-35,-196],[39,-247],[115,-140]],[[55838,75350],[-5,-151],[-91,-84],[-16,-187],[-129,-279]],[[55427,75855],[-47,91]],[[55380,75946],[-18,183],[120,284],[18,-109],[75,51]],[[55575,76355],[59,-154],[66,-59],[19,-209]],[[65575,66834],[52,-196]],[[65665,66183],[-142,-2],[-23,-375],[50,-80],[-126,-114],[-1,-235],[-81,-238],[-7,-232]],[[65335,64907],[-56,-122],[-835,290],[-106,584],[-11,133]],[[31400,20215],[-168,16],[-297,0],[0,1286]],[[32587,39017],[511,-940],[227,-88],[339,-425],[286,-225],[40,-254],[-273,-876],[280,-156],[312,-88],[220,92],[252,441],[45,509]],[[34826,37007],[138,110],[139,-332],[-6,-460],[-234,-318],[-186,-234],[-314,-559],[-370,-786]],[[33993,34428],[-70,-461],[-74,-592],[3,-573],[-61,-128],[-21,-372]],[[33770,32302],[-19,-301]],[[31227,25165],[273,-422],[266,-116]],[[30952,21711],[-257,90],[-672,77],[-115,336],[6,431],[-185,-37],[-98,209],[-24,611],[213,253],[88,365],[-33,292],[148,491],[101,763],[-30,338],[122,109],[-30,217],[-129,115],[92,242],[-126,218],[-65,665],[112,117],[-47,702],[65,590],[75,513],[166,209],[-84,563],[-1,529],[210,376],[-7,481],[159,562],[1,530],[-72,105],[-128,994],[171,592],[-27,558],[100,523],[182,540],[196,358],[-83,226],[58,186],[-9,960],[302,284],[96,598],[-34,144]],[[31359,38736],[231,521],[364,-141],[163,-416],[109,464],[316,-24],[45,-123]],[[62106,75494],[386,89]],[[62492,75583],[57,-151],[106,-100],[-56,-144],[148,-198],[-78,-183],[118,-157],[124,-94],[7,-399]],[[62918,74157],[-101,-17]],[[62817,74140],[-113,333],[1,89],[-123,-2],[-82,155],[-58,-16]],[[62442,74699],[-109,168],[-207,144],[27,280],[-47,203]],[[794,3215],[294,183]],[[1088,3398],[38,-6],[32,-5]],[[54716,79543],[-21,-236],[-156,-1],[53,-125],[-92,-370]],[[54500,78811],[-53,-97],[-243,-15],[-140,-130],[-229,44]],[[53835,78613],[-398,149],[-62,200],[-274,-100],[-32,-109],[-169,81]],[[52900,78834],[-142,16],[-125,105],[42,141],[-10,102]],[[52665,79198],[83,32],[141,-160],[39,152],[245,-25],[199,104],[133,-18],[87,-118],[26,98],[-40,375],[100,73],[98,266]],[[53776,79977],[206,-186],[157,236],[98,43],[215,-176],[131,30],[128,-109]],[[54711,79815],[-23,-73],[28,-199]],[[62817,74140],[-190,76],[-141,266],[-44,217]],[[63641,75603],[141,-408],[130,-27]],[[63720,74519],[-48,-202],[-101,-135]],[[63578,73897],[-69,-28],[-173,301],[95,285],[-82,169],[-104,-43],[-327,-424]],[[62492,75583],[68,94],[207,-165],[149,-34],[38,67],[-136,312],[72,79]],[[62890,75936],[78,-19],[191,-350],[122,-39],[48,146],[166,232]],[[58149,49238],[-17,694],[-70,262]],[[58062,50194],[169,-45],[85,328],[147,-38]],[[58463,50439],[16,-227],[60,-130],[3,-187],[-69,-121],[-108,-300],[-101,-209],[-115,-27]],[[50920,81398],[204,-45],[257,120],[176,-252],[153,-135]],[[51710,81086],[-32,-389]],[[51678,80697],[-72,-22],[-30,-323]],[[51576,80352],[-243,263],[-143,-45],[-194,272],[-129,231],[-129,9],[-40,203]],[[50747,55434],[-229,-68]],[[50518,55366],[-69,398],[13,1322],[-56,119],[-11,283],[-96,201],[-85,170],[35,303]],[[50249,58162],[96,66],[56,251],[136,54],[61,172]],[[50598,58705],[93,169],[100,2],[212,-332]],[[51003,58544],[-11,-191],[62,-342],[-54,-232],[29,-154],[-135,-357],[-86,-176],[-52,-364],[7,-366],[-16,-928]],[[49214,57382],[-190,149],[-130,-22],[-97,-145],[-125,122],[-49,190],[-125,126]],[[48498,57802],[-18,334],[76,244],[-7,195],[221,477],[41,395],[76,141],[134,-78],[116,117],[38,148],[216,259],[53,180],[259,238],[153,82],[70,-110],[178,3]],[[50104,60427],[-22,-280],[37,-262],[156,-376],[9,-279],[320,-130],[-6,-395]],[[50249,58162],[-243,13]],[[50006,58175],[-128,46],[-90,-93],[-123,42],[-482,-27],[-7,-327],[38,-434]],[[75742,64522],[-6,-413],[-97,88],[18,-464]],[[75162,64725],[-87,-321],[-118,117]],[[74730,64531],[-43,474],[-96,433],[47,347],[-171,154],[62,210],[173,215],[-200,305],[98,390],[220,-248],[133,-29],[24,-400],[265,-79],[257,8],[160,-98],[-128,-487],[-124,-34],[-86,-327],[152,-299],[46,368],[76,2],[147,-914]],[[56293,77303],[80,-236],[108,42],[213,-90],[408,-30],[138,147],[327,133],[202,-209],[163,-60]],[[57776,76021],[-239,77],[-283,-181]],[[57254,75917],[-3,-287],[-252,-55],[-196,202],[-222,-159],[-206,17]],[[56375,75635],[-20,381],[-139,185]],[[56216,76201],[46,81],[-30,69],[47,183],[105,180],[-135,248],[-24,211],[68,130]],[[55279,77663],[100,2],[-69,-253],[134,-222],[-41,-271],[-65,-25]],[[55338,76894],[-52,-53],[-90,-134],[-41,-316]],[[55155,76391],[-246,218],[-105,240],[-106,128],[-127,215],[-61,178],[-136,270],[59,239],[99,-133],[60,120],[130,13],[239,-96],[192,8],[126,-128]],[[56523,82877],[268,-4],[302,217],[64,325],[228,184],[-26,258]],[[57359,83857],[169,97],[298,222]],[[57826,84176],[293,-144],[39,-143],[146,68],[272,-137],[27,-270],[-60,-156],[174,-377],[113,-105],[-16,-104],[187,-101],[80,-154],[-108,-126],[-224,20],[-54,-53],[66,-192],[68,-368]],[[58829,81834],[-239,-34],[-85,-127],[-18,-290],[-111,56],[-250,-28],[-73,135],[-104,-100],[-105,83],[-218,11],[-310,139],[-281,45],[-215,-13],[-152,-156],[-133,-23]],[[56535,81532],[-6,257],[-85,267],[166,117],[2,230],[-77,219],[-12,255]],[[25238,62085],[-2,85],[33,26],[51,-68],[99,348],[53,7]],[[25297,60979],[-83,-1],[22,650],[2,457]],[[31359,38736],[-200,-79],[-109,794],[-150,646],[88,557],[-146,244],[-37,416],[-136,391]],[[30669,41705],[175,622],[-119,484],[63,194],[-49,213],[108,288],[6,490],[13,405],[60,195],[-240,926]],[[30686,45522],[206,-48],[143,12],[62,174],[243,234],[147,216],[363,98],[-29,-432],[34,-221],[-23,-386],[302,-516],[311,-95],[109,-216],[188,-114],[115,-167],[175,6],[161,-171],[12,-333],[55,-168],[3,-248],[-81,-10],[107,-671],[533,-23],[-41,-333],[30,-227],[151,-162],[66,-358],[-49,-453],[-77,-253],[27,-328],[-87,-119]],[[33842,40210],[-4,177],[-259,295],[-258,8],[-484,-167],[-133,-507],[-7,-310],[-110,-689]],[[34826,37007],[54,332],[38,340],[0,317],[-100,105],[-104,-94],[-103,26],[-33,222],[-26,527],[-52,172],[-187,156],[-114,-113],[-293,111],[18,782],[-82,320]],[[30686,45522],[-157,-99],[-126,66],[18,875],[-228,-339],[-245,15],[-105,307],[-184,33],[59,247],[-155,351],[-115,518],[73,106],[0,243],[168,166],[-28,312],[71,200],[20,269],[318,392],[227,111],[37,86],[251,-27]],[[30585,49354],[125,1579],[6,250],[-43,330],[-123,210],[1,418],[156,95],[56,-60],[9,221],[-162,60],[-4,360],[541,-13],[92,198],[77,-182],[55,-340],[52,71]],[[31423,52551],[153,-304],[216,37],[54,176],[206,135],[115,94],[32,244],[198,164],[-15,121],[-235,49],[-39,363],[12,386],[-125,149],[52,53],[206,-73],[221,-144],[80,136],[200,89],[310,216],[102,220],[-37,162]],[[33129,54824],[145,26],[64,-133],[-36,-253],[96,-87],[63,-268],[-77,-203],[-44,-490],[71,-291],[20,-267],[171,-270],[137,-28],[30,112],[88,25],[126,101],[90,153],[154,-48],[67,20]],[[34294,52923],[151,-47],[25,118],[-46,114],[28,167],[112,-51],[131,59],[159,-122]],[[34854,53161],[121,-119],[86,156],[62,-24],[38,-162],[133,41],[107,219],[85,424],[164,527]],[[36494,51694],[10,-578],[211,378]],[[38626,39196],[-225,-250],[-65,-345]],[[35174,32383],[-77,326],[122,273],[-160,392],[-218,318],[-286,369],[-103,-17],[-279,446],[-180,-62]],[[82069,54967],[-13,-284],[-16,-368],[-133,18],[-58,-196],[-126,299]],[[75471,67823],[113,-184],[-20,-354],[-227,-17],[-234,39],[-175,-90],[-252,218],[-6,115]],[[74670,67550],[184,429],[150,146],[198,-134],[147,-14],[122,-154]],[[58175,39107],[-393,-424],[-249,-430],[-93,-383],[-83,-217],[-152,-46],[-48,-275],[-28,-180],[-178,-134],[-226,28],[-133,162],[-117,70],[-135,-134],[-68,-276],[-132,-173],[-139,-257],[-199,-59],[-62,202],[26,351],[-165,548],[-75,86]],[[55526,37566],[0,1681],[274,20],[8,2051],[207,19],[428,202],[106,-238],[177,226],[85,1],[156,130]],[[56967,41658],[50,-43]],[[57017,41615],[107,-460],[56,-103],[87,-333],[315,-633],[119,-62],[0,-203],[82,-365],[215,-88],[177,-261]],[[54244,56103],[229,44],[52,148],[46,-11],[69,-131],[350,221],[118,224],[145,202],[-28,202],[78,53],[269,-35],[261,266],[201,629],[141,233],[176,98]],[[56351,58246],[31,-246],[160,-360],[1,-235],[-45,-240],[18,-179],[96,-166]],[[56612,56820],[212,-252]],[[56824,56568],[152,-232],[2,-188],[187,-299],[116,-250],[70,-345],[208,-228],[44,-183]],[[57603,54843],[-91,-61],[-178,14],[-209,60],[-104,-49],[-41,-140],[-90,-17],[-110,121],[-309,-287],[-127,58],[-38,-45],[-83,-347],[-207,112],[-203,57],[-177,212],[-229,196],[-149,-186],[-108,-292],[-25,-402]],[[55125,53847],[-178,33],[-188,96],[-166,-305],[-146,-536]],[[54447,53135],[-29,167],[-12,263],[-127,185],[-103,297],[-23,207],[-132,301],[23,171],[-28,243],[21,446],[67,105],[140,583]],[[27392,90477],[-544,-403],[-386,-88]],[[23714,86446],[-16,-669],[409,-96]],[[28738,84386],[-23,385],[-188,489]],[[30174,87037],[495,-44],[-8,-483]],[[31876,86308],[184,267],[216,-514]],[[31513,80124],[415,58],[246,-283]],[[31350,77823],[-181,326],[0,785],[-123,166],[-187,-98],[-92,152],[-212,-435],[-84,-448],[-99,-262],[-118,-89],[-89,-29],[-28,-142],[-512,-1],[-422,-4],[-125,-106],[-294,-414],[-34,-45],[-89,-225],[-255,0],[-273,-2],[-125,-91],[44,-113],[25,-176],[-5,-58],[-363,-287],[-286,-90],[-323,-308],[-70,0],[-94,91],[-31,82],[6,60],[61,202],[131,317],[81,340],[-56,500],[-59,523],[-290,270],[35,103],[-41,70],[-76,0],[-56,91],[-14,137],[-54,-60],[-75,18],[17,57],[-65,57],[-27,151],[-216,185],[-224,191],[-272,223],[-261,209],[-248,-163],[-91,-6],[-342,150],[-225,-75],[-269,179],[-284,91],[-194,36],[-86,97],[-49,317],[-94,-3],[-1,-221],[-575,0],[-951,0],[-944,-1],[-833,1],[-834,0],[-819,0],[-847,0],[-273,0],[-825,0],[-788,0]],[[14130,82210],[-48,464],[-336,419]],[[13740,83389],[154,278],[-7,363],[-473,367],[-284,657],[-173,413],[-255,259],[-187,236],[-147,298],[-279,-187],[-270,-321],[-247,378],[-194,252],[-271,160],[-273,17],[1,3279],[2,2137]],[[12326,91747],[336,179],[413,-70]],[[17987,91511],[374,-292],[-390,-286]],[[22622,91222],[247,100],[431,-195]],[[19722,91438],[-704,-86],[-494,-54]],[[15020,93217],[119,244],[192,421]],[[16539,93189],[0,-251],[-731,-278]],[[52900,78834],[-22,-236],[-122,-97],[-206,72],[-60,-232],[-132,-18],[-48,91],[-156,-195],[-134,-28],[-120,124]],[[51900,78315],[-95,252],[-133,-90],[5,261],[203,323],[-9,147],[126,-53],[77,98]],[[52074,79253],[236,-4],[57,125],[298,-176]],[[31070,19804],[-137,18],[-164,46]],[[29661,29221],[-80,562],[-22,649]],[[30452,41263],[143,147],[74,295]],[[86288,76244],[-179,340],[-111,-323],[-429,-248],[44,-304],[-241,21],[-131,181],[-191,-409],[-306,-309],[-227,-370]],[[83987,73399],[45,-302],[-393,-161]],[[80013,64241],[-280,149],[-132,234],[44,332],[-254,105],[-134,216],[-236,-307],[-271,-66],[-221,3],[-149,-141]],[[78380,64766],[-144,-84],[42,-659],[-148,16],[-25,135]],[[78105,64174],[-9,238],[-203,-167],[-121,106],[-206,216],[81,478],[-176,112],[-66,530],[-293,-96],[33,684],[263,480],[11,475],[-8,441],[-121,137],[-93,339],[-162,-42]],[[77035,68105],[-300,86],[94,242],[-130,358],[-198,-243],[-233,142],[-321,-367],[-252,-428],[-224,-72]],[[74670,67550],[-23,454],[-170,-121]],[[74477,67883],[-324,56],[-314,132],[-225,253],[-216,114],[-93,276],[-157,83],[-280,375],[-223,177],[-115,-138]],[[72530,69211],[-386,403],[-273,365],[-78,635],[200,-78],[9,294],[-111,295],[28,470],[-298,675]],[[71621,72270],[-457,233],[-82,442],[-205,269]],[[70827,73379],[-42,328],[10,224],[-169,131],[-91,-58],[-70,533]],[[70465,74537],[79,132],[-39,135],[266,272],[192,112],[294,-77],[105,368],[356,68],[99,229],[438,312],[39,130]],[[72294,76218],[-22,328],[190,150],[-250,1000],[550,231],[143,128],[200,1031],[551,-190],[155,261],[13,577],[230,54],[212,383]],[[74266,80171],[109,48]],[[74375,80219],[73,-402],[233,-306],[396,-216],[192,-464],[-107,-673],[100,-249],[330,-99],[374,-80],[336,-359],[171,-64],[127,-531],[163,-342],[306,14],[574,-129],[369,80],[274,-86],[411,-350],[336,1],[123,-179],[324,309],[448,200],[417,21],[324,203],[200,309],[194,193],[-45,190],[-89,222],[146,371],[156,-52],[286,-117],[277,306],[423,223],[204,380],[195,164],[404,77],[219,-65],[30,204],[-251,403],[-223,184],[-214,-212],[-274,89],[-157,-73],[-72,236],[197,575],[135,434]],[[82410,80559],[333,-217],[392,364],[-3,253],[251,611],[155,184],[-4,318],[-152,137],[229,287],[345,104],[369,15],[415,-171],[244,-212],[172,-581],[104,-248],[97,-354],[103,-564],[483,-184],[329,-409],[112,-541],[423,-1],[240,227],[459,170],[-146,-518],[-107,-211],[-96,-631],[-186,-560],[-338,102],[-238,-203],[73,-494],[-40,-680],[-142,-16],[2,-292]],[[47857,54343],[22,474],[26,72],[-8,227],[-118,241],[-88,39],[-81,158],[60,256],[-28,278],[13,168]],[[47655,56256],[44,0],[17,251],[-22,112],[27,80],[103,69],[-69,461],[-64,238],[23,195],[55,45]],[[47769,57707],[36,52],[77,-86],[215,-5],[51,168],[48,-11],[80,65],[43,-246],[65,72],[114,86]],[[49214,57382],[74,-819],[-117,-484],[-73,-650],[121,-496],[-13,-227]],[[53632,53135],[-35,31],[-164,-74],[-169,77],[-132,-38]],[[53132,53131],[-452,14]],[[52429,54336],[-72,82],[4,159]],[[52361,54577],[71,408],[132,556],[81,5],[165,337],[105,9],[156,-236],[191,194],[26,239],[63,232],[43,291],[148,238],[56,403],[59,128],[39,299],[74,368],[234,446],[14,191],[31,104],[-110,229]],[[53939,59018],[9,184],[78,33]],[[54026,59235],[111,-369],[18,-382],[-10,-383],[151,-523],[-155,6],[-78,-41],[-127,57],[-60,-271],[164,-336],[121,-98],[39,-239],[87,-397],[-43,-156]],[[54447,53135],[-20,-311],[-220,136],[-225,152],[-350,23]],[[58564,53850],[-16,-673],[111,-78],[-89,-205],[-107,-153],[-106,-300],[-59,-268],[-15,-462],[-65,-220],[-2,-434]],[[58216,51057],[-80,-161],[-10,-342],[-38,-45],[-26,-315]],[[58149,49238],[50,-530],[-27,-299],[55,-334],[161,-323],[150,-726]],[[58538,47026],[-109,59],[-373,-97],[-75,-69],[-79,-368],[62,-254],[-49,-681],[-34,-578],[75,-103],[194,-224],[76,105],[23,-621],[-212,4],[-114,317],[-103,246],[-213,80],[-62,302],[-170,-182],[-222,81],[-93,261],[-176,53],[-131,-14],[-15,179],[-96,15]],[[53609,49076],[73,-59],[95,221],[152,-6],[17,-163],[104,-102],[164,361],[161,281],[71,185],[-10,473],[121,560],[127,296],[183,278],[32,184],[7,211],[45,200],[-14,326],[34,510],[55,360],[83,308],[16,347]],[[57603,54843],[169,-475],[124,-70],[75,97],[128,-38],[155,122],[66,-246],[244,-383]],[[53081,49538],[212,318],[-105,381],[95,144],[187,71],[23,255],[148,-276],[245,-25],[85,273],[36,382],[-31,450],[-131,341],[120,667],[-69,114],[-207,-47],[-78,298],[21,251]],[[29063,51742],[-119,136],[-137,191],[-79,-92],[-235,80],[-68,248],[-52,-9],[-278,329]],[[28366,55989],[36,280],[89,-41],[52,171],[-64,339],[34,85]],[[28513,56823],[143,-19]],[[30185,58611],[-178,-96],[-71,-288],[-107,-165],[-81,-215],[-34,-410],[-77,-337],[144,-39],[35,-265],[62,-126],[21,-232],[-33,-213],[10,-120],[69,-48],[66,-201],[357,55],[161,-73],[196,-496],[112,62],[200,-31],[158,66],[99,-99],[-50,-311],[-62,-193],[-22,-413],[56,-383],[79,-171],[9,-129],[-140,-286],[100,-127],[74,-202],[85,-574]],[[30585,49354],[-139,306],[-83,14],[179,586],[-213,270],[-166,-50],[-101,100],[-153,-152],[-207,72],[-163,603],[-129,149],[-89,272],[-184,272],[-74,-54]],[[26191,58215],[42,74],[183,-152],[63,75],[89,-48],[46,-119],[82,-38],[66,122]],[[27070,57338],[-107,-51],[1,-232],[58,-86],[-41,-68],[10,-104],[-23,-117],[-14,-114]],[[59437,72019],[-30,20],[-53,-44],[-42,12],[-14,-22],[-5,59],[-20,35],[-54,6],[-75,-49],[-52,30]],[[53776,79977],[-157,247],[-141,139],[-30,243],[-49,171],[202,125],[103,144],[200,111],[70,110],[73,-66],[124,60]],[[54171,81261],[132,-186],[207,-50],[-17,-158],[151,-119],[41,148],[191,-64],[26,-180],[207,-35],[127,-284]],[[55236,80333],[-82,0],[-43,-104],[-64,-25],[-18,-131],[-54,-28],[-7,-53],[-95,-60],[-123,10],[-39,-127]],[[53922,82787],[64,-293],[-77,-154],[101,-205],[69,-308],[-22,-199],[114,-367]],[[52074,79253],[35,410],[140,395],[-400,106],[-131,151]],[[51718,80315],[16,252],[-56,130]],[[51710,81086],[-47,604],[167,0],[70,217],[69,527],[-51,195]],[[52368,83481],[210,-76],[178,88]],[[61984,58430],[-102,-308]],[[61882,58122],[-62,103],[-67,-41],[-155,9],[-4,176],[-22,159],[94,269],[98,255]],[[61764,59052],[119,-50],[83,141]],[[52880,84188],[-200,-415],[76,-280]],[[52617,84754],[98,159],[223,162]],[[30081,62221],[5,157],[-71,172],[68,97],[21,222],[-24,314]],[[53333,65346],[-952,-1097],[-804,-1132],[-392,-257]],[[51185,62860],[-308,-56],[-3,366],[-129,94],[-173,165],[-66,270],[-937,1256],[-937,1257]],[[48632,66212],[-1045,1394]],[[47587,67606],[6,112],[-1,38]],[[47592,67756],[-2,682],[449,425],[277,88],[227,155],[107,288],[324,228],[12,427],[161,50],[126,213],[363,97],[51,224],[-73,122],[-96,608],[-17,350],[-104,369]],[[52339,73106],[-57,-295],[44,-549],[-65,-475],[-171,-322],[24,-433],[227,-344],[3,-139],[171,-232],[118,-1034]],[[52633,69283],[90,-509],[15,-267],[-49,-470],[21,-263],[-36,-315],[24,-362],[-110,-240],[164,-420],[11,-247],[99,-321],[130,105],[219,-267],[122,-361]],[[29063,51742],[38,-438],[-86,-374],[-303,-603],[-334,-227],[-170,-501],[-53,-389],[-157,-237],[-116,291],[-113,62],[-114,-45],[-8,211],[79,137],[-33,240]],[[60240,64499],[-1102,0],[-1077,0],[-1117,0]],[[56944,64499],[0,2120],[0,2048],[-83,464],[71,356],[-43,246],[101,276]],[[57627,69867],[275,-171],[129,-89]],[[59518,69808],[182,-989]],[[61764,59052],[-95,187],[-114,337],[-124,185],[-71,199],[-242,231],[-191,7],[-67,120],[-163,-135],[-168,261],[-87,-430],[-323,121]],[[60119,60135],[-30,230],[120,847],[27,382],[88,177],[204,95],[141,328]],[[49471,76836],[111,-224],[511,-262],[101,125],[313,-261],[322,75]],[[49403,72949],[-352,-8],[-265,10]],[[47929,73193],[-23,191],[103,216],[38,156],[-96,172],[77,378],[-111,345],[120,48],[11,272],[45,84],[3,449],[129,156],[-78,289],[-162,20],[-47,-72],[-164,-1],[-70,282],[-113,-84],[-101,-146]],[[56753,85111],[32,340]],[[57772,86080],[42,-100],[-198,-332],[83,-537],[-120,-183]],[[57579,84928],[-229,1],[-239,214],[-121,70],[-237,-102]],[[61882,58122],[-61,-204],[103,-317],[102,-277],[106,-206],[909,-683],[233,3]],[[63274,56438],[-785,-1728],[-362,-26],[-247,-406],[-178,-10],[-76,-182]],[[61626,54086],[-190,0],[-112,195],[-254,-241],[-82,-240],[-185,45],[-62,67],[-65,-16],[-87,6],[-352,489],[-193,0],[-95,189],[0,324],[-145,96]],[[59804,55000],[-164,627],[-127,133],[-48,231],[-141,280],[-171,42],[95,328],[147,14],[42,176]],[[59437,56831],[-4,517]],[[59433,57348],[82,603],[132,161],[28,236],[119,440],[168,285],[112,567],[45,495]],[[57942,91602],[-41,-403],[425,-383],[-256,-435],[323,-655],[-187,-494],[250,-429],[-113,-375],[411,-394],[-105,-294],[-258,-333],[-594,-735]],[[56639,89841],[-93,225],[-8,886],[-433,392],[-371,282]],[[55734,91626],[167,152],[309,-304],[362,29],[298,-140],[265,255],[137,422],[431,196],[356,-229],[-117,-405]],[[34854,53161],[70,246],[24,262],[48,246],[-107,340]],[[34889,54255],[-22,394],[144,495]],[[51576,80352],[62,-50],[80,13]],[[51900,78315],[-11,-163],[82,-216],[-97,-176],[72,-445],[151,-73],[-32,-250]],[[52636,52411],[94,33],[404,-6],[-2,693]],[[48278,82851],[-210,118],[-172,-8],[57,309],[-57,309]],[[49420,84027],[22,-61],[248,-679]],[[49051,81445],[-2,0],[-434,96]],[[48727,82636],[413,-52],[1,0]],[[49181,82918],[-186,355],[-4,8]],[[61098,76843],[34,68],[235,-99],[409,-93],[378,-276],[48,-107],[169,90],[259,-120],[85,-236],[175,-134]],[[62106,75494],[-268,282],[-296,-27]],[[50006,58175],[-20,-180],[116,-297],[-1,-418],[27,-454],[69,-210],[-61,-518],[22,-287],[74,-365],[62,-202]],[[47655,56256],[-78,14],[-57,-232],[-78,3],[-55,123],[19,231],[-116,353],[-73,-65],[-59,-13]],[[47158,56670],[-77,-33],[3,211],[-44,151],[9,168],[-60,242],[-78,206],[-222,0],[-65,-108],[-76,-13],[-48,-125],[-32,-159],[-148,-254]],[[45797,58187],[123,281],[84,-11],[73,97],[61,1],[44,76],[-24,191],[31,60],[5,195]],[[46194,59077],[134,-5],[200,-141],[61,13],[21,64],[151,-45],[40,32]],[[46801,58995],[16,-211],[44,1],[73,77],[46,-20],[77,-146],[119,-46],[76,125],[90,77],[67,80],[55,-15],[62,-126],[33,-159],[114,-241],[-57,-149],[-11,-187],[59,57],[35,-67],[-15,-172],[85,-166]],[[45357,59658],[302,17],[63,136],[88,10],[110,-142],[86,-3],[92,97],[56,-166],[-120,-130],[-121,11],[-119,121],[-103,-133],[-50,-5],[-67,-80],[-253,12]],[[45367,58962],[147,93],[92,-18],[75,65],[513,-25]],[[55838,75350],[182,51],[106,126],[150,-11],[46,100],[53,19]],[[57254,75917],[135,-153],[-86,-360],[-66,-65]],[[24381,60202],[7,168],[32,135],[-39,107],[133,470],[357,1],[7,197],[-45,35],[-31,124],[-103,133],[-103,193],[125,1],[1,324],[259,1],[257,-6]],[[25493,60887],[-127,-220],[-131,-161],[-20,-111],[22,-113],[-58,-146]],[[25179,60136],[-65,-36],[15,-67],[-52,-64],[-95,-145],[-9,-85]],[[34125,55269],[-44,-518],[-169,-150],[15,-136],[-51,-297],[123,-418],[89,-1],[37,-325],[169,-501]],[[33129,54824],[-188,437],[75,159],[-5,265],[171,93],[69,108],[-95,213],[24,210],[220,339]],[[25613,59537],[19,231],[-38,62],[-57,41],[-122,-68],[-10,77],[-84,93],[-60,114],[-82,49]],[[26903,60465],[-95,12],[-38,-79],[-97,-75],[-70,0],[-61,-73],[-56,26],[-47,88],[-29,-17],[-36,-138],[-27,5],[-4,-118],[-97,-159],[-51,-68],[-29,-72],[-82,117],[-60,-154],[-58,4],[-65,-14],[6,-283],[-41,-5],[-35,-131],[-86,-24]],[[55230,78267],[67,-223],[89,-164],[-107,-217]],[[55155,76391],[-31,-98]],[[53809,78032],[194,-20],[51,98],[94,-94],[109,-12],[-1,161],[97,59],[27,233],[221,153]],[[54601,78610],[88,-71],[208,-247],[229,-111],[104,86]],[[54716,79543],[141,-148],[103,-62],[233,70],[22,116],[111,17],[135,89],[30,-37],[130,72],[66,136],[91,35],[297,-175],[59,59]],[[56134,79715],[155,-157],[19,-154]],[[56308,79404],[-170,-121],[-131,-391],[-168,-390],[-223,-109]],[[55616,78393],[-173,26],[-213,-152]],[[54601,78610],[-54,194],[-47,7]],[[84713,46708],[28,-113],[5,-175]],[[89166,50332],[5,-1877],[4,-1876]],[[80461,52985],[47,-385],[190,-325],[179,117],[177,-42],[162,291],[133,51],[263,-162],[226,123],[143,801],[107,200],[96,655],[319,0],[241,-97]],[[72530,69211],[-176,-261],[-108,-538],[269,-218],[262,-283],[362,-323],[381,-75],[160,-293],[215,-54],[334,-135],[231,10],[32,228],[-36,366],[21,248]],[[77035,68105],[20,-219],[-97,-105],[23,-355],[-199,104],[-359,-397],[8,-330],[-153,-483],[-14,-281],[-124,-474],[-217,131],[-11,-596],[-63,-196],[30,-245],[-137,-137]],[[72692,61222],[-251,-206],[-129,-31]],[[68937,65473],[185,384],[612,-1],[-56,494],[-156,292],[-31,444],[-182,258],[306,604],[323,-44],[290,604],[174,584],[270,578],[-4,411],[236,333],[-224,284],[-96,390],[-99,504],[137,249],[421,-141],[310,86],[268,484]],[[64978,73251],[244,112],[197,329],[186,-17],[122,108],[197,-53],[308,-292],[221,-63],[318,-510],[207,-21],[24,-484]],[[66909,69007],[137,-302],[112,-348],[266,-253],[7,-508],[133,-93],[23,-265],[-400,-298],[-105,-669]],[[66559,66445],[-303,133],[-313,74]],[[63594,69288],[-104,-224]],[[63490,69064],[-153,302],[-3,307],[-89,0],[46,417],[-143,438],[-340,315],[-193,548],[65,449],[139,199],[-21,336],[-182,173],[-180,687]],[[62436,73235],[-152,461],[55,179],[-87,660],[190,164]],[[63490,69064],[-164,28]],[[63326,69092],[-187,48],[-204,-553]],[[62935,68587],[-516,46],[-784,1158],[-413,403],[-335,156]],[[60887,70350],[-112,701]],[[60775,71051],[615,600],[105,696],[-26,421],[152,142],[142,359]],[[61763,73269],[119,90],[324,-75],[97,-146],[133,97]],[[59922,70666],[-49,-182]],[[59873,70484],[-100,80],[-58,-383],[69,-65],[-71,-79],[-12,-152],[131,78]],[[59832,69963],[7,-224],[-139,-920]],[[59579,70030],[74,270],[56,434]],[[59757,70886],[93,-1],[25,101],[75,7]],[[59950,70993],[4,-236],[-38,-87],[6,-4]],[[53835,78613],[-31,-283],[67,-246]],[[53897,76455],[309,-464],[217,3]],[[55081,74756],[-154,268],[-242,95]],[[54084,75213],[-179,104],[-120,232]],[[59922,70666],[309,-228],[544,613]],[[60887,70350],[-53,-87],[-556,-289],[277,-575],[-92,-98],[-46,-193],[-212,-80],[-66,-207],[-120,-177],[-310,91]],[[59832,69963],[41,169],[0,352]],[[69711,76170],[-159,-107],[-367,-401],[-121,-412],[-104,-4],[-76,273],[-353,18],[-57,472],[-135,4],[21,578],[-333,421],[-476,-45],[-326,-84],[-265,519],[-227,218],[-431,412],[-52,50],[-715,-340],[11,-2124]],[[65546,75618],[-142,-28],[-195,452],[-188,161],[-315,-120],[-123,-191]],[[63639,78550],[-142,93],[29,296],[-177,385],[-207,-16],[-235,391],[160,436],[-81,118],[222,632],[285,-334],[35,421],[573,626],[434,15],[612,-399],[329,-233],[295,243],[440,12],[356,-298],[80,170],[391,-24],[69,272],[-450,396],[267,281],[-52,157],[266,150],[-200,394],[127,197],[1039,200],[136,142],[695,213],[250,239],[499,-124],[88,-597],[290,140],[356,-197],[-23,-314],[267,33],[696,543],[-102,-180],[355,-445],[620,-1463],[148,302],[383,-332],[399,148],[154,-104],[133,-332],[194,-112],[119,-244],[358,77],[147,-353]],[[72294,76218],[-171,84],[-140,207],[-412,61],[-461,15],[-100,-63],[-396,242],[-158,-119],[-43,-340],[-457,198],[-183,-81],[-62,-252]],[[60889,49136],[-399,576],[-19,334],[-1007,1173],[-47,63]],[[59417,51282],[-3,611],[80,233],[137,381],[101,420],[-123,661],[-32,289],[-132,400]],[[59445,54277],[171,344],[188,379]],[[61626,54086],[-243,-653],[3,-2098],[165,-475]],[[70465,74537],[-526,-87],[-343,187],[-301,-45],[26,332],[303,-96],[101,177]],[[69725,75005],[212,-56],[355,414],[-329,304],[-198,-144],[-205,217],[234,373],[-83,57]],[[78495,58847],[-66,696],[178,479],[359,110],[261,-83]],[[79227,60049],[229,-226],[126,397],[246,-212]],[[79828,60008],[64,-384],[-34,-690],[-467,-443],[122,-349],[-292,-42],[-240,-232]],[[85134,71634],[-31,313],[51,432],[-122,600]],[[85048,73569],[17,52],[124,-21],[108,260],[197,28],[118,38],[40,139]],[[55575,76355],[52,129]],[[55627,76484],[66,42],[38,191],[50,32],[40,-81],[52,-36],[36,-92],[46,-27],[54,-107],[39,3],[-31,-140],[-33,-68],[9,-43]],[[55993,76158],[-62,-23],[-164,-89],[-13,-118],[-35,5]],[[63448,68272],[-196,-15],[-69,274],[-248,56]],[[79227,60049],[90,260],[12,487],[-224,502],[-18,568],[-211,468],[-210,40],[-56,-201],[-163,-17],[-83,102],[-293,-344],[-6,517],[68,606],[-188,27],[-16,346],[-120,178]],[[77809,63588],[59,212],[237,374]],[[78380,64766],[162,-454],[125,-524],[342,-4],[108,-502],[-178,-151],[-80,-207],[333,-345],[231,-680],[175,-508],[210,-400],[70,-407],[-50,-576]],[[59999,71781],[125,-30],[45,-226],[-151,-217],[-68,-315]],[[46822,55737],[66,184],[15,168],[126,313],[129,268]],[[54125,64996],[-197,-214],[-156,316],[-439,248]],[[52633,69283],[136,133],[24,244],[-30,238],[191,222],[86,185],[135,165],[16,442]],[[55437,69409],[133,264],[-65,442]],[[56944,64499],[0,-1150],[-320,-2],[-3,-242]],[[56621,63105],[-1108,1103],[-1108,1103],[-280,-315]],[[58049,35154],[96,-173],[-85,-281],[-47,-187],[-155,-90],[-51,-184],[-99,-58],[-209,443],[148,365],[151,225],[130,118],[121,-178]],[[56314,83116],[-23,147],[30,157],[-123,92],[-291,100]],[[55907,83612],[-59,485]],[[55848,84097],[318,176],[466,-37],[273,57],[39,-120],[148,-37],[267,-279]],[[56523,82877],[-67,177],[-142,62]],[[56700,84669],[53,442]],[[57579,84928],[134,-133],[24,-279],[89,-340]],[[47592,67756],[-42,0],[7,-308],[-172,-19],[-90,-131],[-126,0],[-100,75],[-234,-62],[-91,-449],[-86,-42],[-131,-726],[-386,-621],[-92,-796],[-114,-258],[-33,-208],[-625,-46],[-5,1]],[[46350,67747],[5,8],[139,221]],[[46753,68040],[218,393],[140,154]],[[57394,79599],[66,85],[185,57],[204,-180],[115,-21],[125,-155],[-20,-195],[101,-95],[40,-240],[97,-147],[-19,-86],[52,-58],[-74,-43],[-164,17],[-27,80],[-58,-46],[20,-103],[-76,-184],[-49,-197],[-70,-63]],[[57842,78025],[-50,263],[30,246],[-9,253],[-160,342],[-89,243],[-86,171],[-84,56]],[[23016,66727],[-107,-505]],[[19117,67920],[-162,303],[-130,281]],[[19608,65285],[-6,-104],[-117,-211]],[[19362,65323],[-181,328],[-201,278]],[[18482,67245],[-37,-75],[-70,151]],[[17464,70566],[316,44],[353,63],[-26,-113],[419,-280],[634,-406],[552,5],[221,0],[0,237],[481,0],[102,-204],[142,-182],[165,-253],[92,-301],[69,-317],[144,-174],[230,-172],[175,455],[227,11],[196,-230],[139,-394],[96,-338],[164,-328],[61,-403],[78,-271],[217,-178],[197,-127],[108,17]],[[55993,76158],[95,33],[128,10]],[[46619,60247],[93,105],[47,339],[88,13],[194,-160],[157,114],[107,-38],[42,128],[1114,8],[62,404],[-48,71],[-134,2485],[-134,2485],[425,11]],[[51185,62860],[1,-1326],[-152,-384],[-24,-355],[-247,-92],[-379,-49],[-102,-205],[-178,-22]],[[46801,58995],[13,179],[-24,223],[-104,162],[-54,330],[-13,358]],[[76989,61578],[-183,-289],[-315,-410]],[[77809,63588],[-159,-134],[-162,-249],[-196,-26],[-127,-623],[-117,-104],[134,-506],[177,-420],[113,-380],[-101,-501],[-96,-106],[66,-289],[185,-458],[32,-321],[-4,-268],[108,-525],[-152,-537],[-135,-591]],[[55380,75946],[-58,44]],[[55338,76894],[74,-99],[40,-80],[91,-62],[106,-119],[-22,-50]],[[74375,80219],[292,99],[530,496],[423,271],[242,-176],[289,-9],[186,-269],[277,-21],[402,-144],[270,401],[-113,339],[288,596],[311,-238],[252,-67],[327,-148],[53,-432],[394,-242],[263,107],[351,75],[279,-76],[272,-276],[168,-295],[258,6],[350,-94],[255,143],[366,96],[407,405],[166,-62],[146,-193],[331,48]],[[59599,45195],[209,47],[334,-163],[73,73],[193,15],[99,173],[167,-10],[303,224],[221,334]],[[59119,36429],[-211,5]],[[58908,36434],[-24,254],[-41,259]],[[58843,36947],[-23,206],[49,642],[-72,410],[-133,810]],[[58664,39015],[292,654],[74,415],[42,52],[31,339],[-45,171],[12,430],[54,400],[0,728],[-145,185],[-132,42],[-60,143],[-128,121],[-232,-11],[-18,215]],[[58409,42899],[-26,410],[843,474]],[[59226,43783],[159,-276],[77,53],[110,-146],[16,-231],[-59,-268],[21,-405],[181,-356],[85,399],[120,122],[-24,740],[-116,417],[-100,185],[-97,-8],[-77,748],[77,438]],[[46619,60247],[-184,395],[-168,424],[-184,153],[-133,169],[-155,-6],[-135,-126],[-138,50],[-96,-185]],[[45402,61432],[78,283],[34,543]],[[45260,63923],[60,192],[1088,-4],[-53,832],[68,296],[261,51],[-9,1474],[911,-30],[1,872]],[[59226,43783],[-147,149],[85,535],[87,201],[-53,477],[56,467],[47,156],[-71,489],[-131,257]],[[59099,46514],[273,-108],[55,-159],[95,-269],[77,-783]],[[77801,55552],[48,103],[227,-252],[22,-296],[183,69],[91,236]],[[56448,41738],[228,131],[180,-33],[109,-130],[2,-48]],[[55526,37566],[0,-2127],[-248,-294],[-149,-42],[-175,108],[-125,42],[-47,247],[-109,157],[-133,-284]],[[54125,64996],[68,-895],[104,-150],[4,-183],[116,-198],[-60,-248],[-107,-1168],[-15,-749],[-354,-543],[-120,-759],[115,-213],[0,-371],[178,-13],[-28,-271]],[[53939,59018],[-52,-12],[-188,630],[-65,23],[-217,-322],[-215,168],[-150,34],[-80,-81],[-163,17],[-164,-245],[-141,-14],[-337,298],[-131,-142],[-142,10],[-104,218],[-279,214],[-298,-68],[-72,-124],[-39,-331],[-80,-233],[-19,-514]],[[58639,91887],[-473,-231],[-224,-54]],[[55734,91626],[-172,-23],[-41,-379],[-523,92],[-74,-321],[-267,2],[-183,-409],[-278,-639],[-431,-810],[101,-197],[-97,-228],[-275,10],[-180,-540],[17,-765],[177,-292],[-92,-677],[-231,-395],[-122,-332]],[[52328,85411],[-371,-135],[-384,293]],[[65634,62124],[-173,4],[-109,-145]],[[64752,61418],[-91,403],[-217,950]],[[64444,62771],[833,576],[185,1152],[-127,408]],[[65945,65581],[203,-76],[165,-105]],[[28366,55989],[-93,166],[-59,311]],[[27661,56017],[-130,-29],[-48,344],[-36,-98]],[[27801,57192],[95,172],[153,-33]],[[28408,56982],[105,-159]],[[54111,82956],[434,266],[350,195]],[[55461,83172],[342,-65],[511,9]],[[56535,81532],[139,-502],[-29,-162],[-138,-67],[-252,-479],[71,-259],[-60,34]],[[56266,80097],[-264,221],[-200,-81],[-131,59],[-165,-123],[-140,204],[-114,-78],[-16,34]],[[86288,76244],[39,-101]],[[84641,73775],[76,254],[66,67]],[[84783,74096],[-25,105],[71,311]],[[47420,73919],[-67,218],[22,377]],[[64274,66012],[-77,-41],[-84,114]],[[56308,79404],[120,123],[172,-64],[178,-2],[129,-141],[95,89],[205,55],[69,135],[118,0]],[[57842,78025],[124,-106],[131,93],[126,-99]],[[58229,77764],[-135,-124],[-84,54]],[[56293,77303],[-51,101],[65,97],[-69,72],[-87,-129],[-162,167],[-22,237],[-169,136],[-31,183],[-151,226]],[[55524,83426],[383,186]],[[0,92620],[99999,0]],[[97313,86314],[-397,399],[-724,-453],[-126,214]],[[93543,84865],[14,269],[432,129]],[[95686,87851],[-337,-49],[-167,-474]],[[90412,86000],[-914,-171],[-899,-1124]],[[87534,83347],[438,-73],[136,-360]],[[63219,76972],[-27,-388],[303,-678]],[[60620,78459],[-156,227],[410,236],[-8,125]],[[60617,78955],[9,255],[143,161],[269,42],[44,192],[-62,318],[113,302],[-3,169],[-410,187],[-162,-6],[-172,270],[-213,-92],[-352,203],[6,113],[-99,250],[-222,28],[-23,178],[70,117],[-178,326],[-288,-56],[-84,29],[-70,-131],[-104,24]],[[59670,89780],[18,-267],[18,-589]],[[60317,88878],[-168,248],[177,218]],[[60998,88986],[233,140],[-186,422]],[[62654,90740],[1,-321],[219,-197]],[[63371,90714],[580,274],[970,495]],[[69038,93255],[183,523],[206,114]],[[69427,93892],[736,-152],[57,-320]],[[70220,93420],[-263,-468],[173,-183]],[[72363,94242],[483,116],[669,-25]],[[73891,94709],[321,378],[319,16]],[[75805,95466],[93,157],[729,54]],[[81143,94322],[251,109],[141,-369]],[[88852,92998],[-201,534],[367,250]],[[98811,92070],[799,-275],[-99610,-251]],[[0,89250],[0,-3]],[[58449,51176],[110,-325],[-16,-339],[-80,-73]],[[58216,51057],[67,-59],[166,178]],[[61883,61244],[-37,246],[-83,173]],[[59899,67595],[-141,395],[-139,-2]],[[63694,67644],[47,-203],[190,-242]],[[64444,62771],[-801,-221],[-259,-259],[-199,-604],[-130,-96],[-70,191],[-106,-28],[-269,57],[-50,58],[-321,-13],[-75,-52],[-114,149],[-74,-283],[28,-243],[-121,-183]],[[59434,57280],[-39,11],[5,287],[-33,197],[-143,228],[-34,415],[34,425],[-129,40],[-19,-129],[-167,-29],[67,-169],[23,-346],[-152,-316],[-138,-415],[-144,-59],[-233,336],[-105,-119],[-29,-168],[-143,-109],[-9,-118],[-277,0],[-38,118],[-200,20],[-100,-99],[-77,50],[-143,336],[-48,158],[-200,-79],[-76,-267],[-72,-514],[-95,-109],[-85,-63]],[[56635,56793],[-23,27]],[[56351,58246],[3,140],[-102,169],[-3,335],[-58,222],[-98,-33],[28,211],[72,240],[-32,239],[92,176],[-58,135],[73,355],[127,425],[240,-41],[-14,2286]],[[59433,57348],[1,-68]],[[59434,57280],[3,-449]],[[59445,54277],[-171,-265],[-195,1],[-224,-135],[-176,129],[-115,-157]],[[56824,56568],[-189,225]],[[63438,58380],[158,20]],[[63596,58400],[-2,-9],[-1,-237],[0,-581],[0,-301],[-125,-353],[-194,-481]],[[62934,53474],[-278,-467],[-415,-571]],[[63596,58400],[89,12]],[[34889,54255],[109,-341],[-49,-248],[-24,-263],[-71,-242]],[[56266,80097],[-77,-150],[-55,-232]],[[58908,36434],[-56,-256],[-163,-62],[-166,312],[-2,199],[76,216],[26,168],[80,41],[140,-105]],[[60041,72458],[74,126],[75,127],[15,321],[91,-112],[306,160],[147,-108],[229,1],[320,217],[149,-10],[316,89]],[[50518,55366],[-224,-122]],[[68841,73220],[156,583],[-60,429],[-204,137],[72,254],[232,-27],[132,318],[89,370],[371,134],[-58,-267],[40,-161],[114,15]],[[65546,75618],[313,8],[-45,290],[237,199],[234,334],[374,-304],[30,-460],[106,-118],[301,27],[93,-105],[137,-593],[317,-398],[181,-271],[291,-282],[369,-247],[-7,-352]],[[52339,73106],[302,232],[195,-69]],[[57310,73833],[135,447],[-176,276]],[[57269,74556],[308,550],[428,23],[117,438]],[[58651,75491],[334,373],[324,163]],[[60889,49136],[-128,-710],[16,-326]],[[59099,46514],[-157,172],[-177,97],[-111,97],[-116,146]],[[58449,51176],[98,69],[304,-7],[566,44]],[[60092,77809],[-304,-100],[-377,-333]],[[33939,31983],[-169,319]],[[30523,76986],[-147,-342],[-47,-129]],[[29077,74266],[69,-103],[5,-217]],[[28797,73761],[-183,90],[191,-185]],[[27408,66595],[-105,132],[-148,496]],[[27026,67663],[-42,225],[57,383]],[[27041,68271],[-77,316],[-217,482]],[[25227,69288],[-114,-90],[50,-153]],[[24957,68598],[-202,17],[-207,305]],[[16564,71667],[-71,93],[-33,316]],[[15496,76016],[-89,441],[109,543]],[[15516,77000],[34,523],[33,522]],[[15533,78818],[-88,492],[-80,268]],[[15948,78951],[69,152],[-45,472]],[[13587,83606],[-245,183],[-78,503]],[[8164,86018],[-308,-122],[-39,339]],[[4226,83160],[-43,96],[304,270]],[[3654,89313],[-351,334],[390,241]],[[3832,91498],[493,19],[350,262]],[[31057,57908],[249,-6],[297,60]],[[33102,57232],[45,-462],[144,13],[109,-135]],[[62539,59289],[-43,-146],[-137,12],[-89,-78]],[[57838,32957],[-210,-262],[-290,-224]],[[56553,32368],[-168,-71],[-115,31]],[[55331,31983],[-94,10],[-120,258]],[[58175,39107],[113,-6],[134,-97],[94,69],[148,-58]],[[58409,42899],[-210,-79],[-159,-230],[-33,-199],[-100,-46],[-241,-473],[-154,-373],[-94,-13],[-90,66],[-311,63]]],"transform":{"scale":[0.0036000360003600037,0.001736468664686647],"translate":[-180,-90]}}
    };
}));

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/ChoroplethContinents.js',["d3", "topojson", "./Choropleth", "./countries"], factory);
    } else {
        root.map_ChoroplethContinents = factory(root.d3, root.topojson, root.map_Choropleth, root.map_countries);
    }
}(this, function (d3, topojson, Choropleth, Countries) {
    function ChoroplethContinents() {
        Choropleth.call(this);

        this._choroTopology = Countries.topology;
        this._choroTopologyObjects = Countries.topology.objects.land;
    }
    ChoroplethContinents.prototype = Object.create(Choropleth.prototype);
    ChoroplethContinents.prototype.constructor = ChoroplethContinents;
    ChoroplethContinents.prototype._class += " map_ChoroplethContinents";

    return ChoroplethContinents;
}));

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/us-counties.js',[], factory);
    } else {
        root.map_usCounties = factory();
    }
}(this, function () {
    return {
        stateNames: {
            "1": {
                "name": "Alabama",
                "code": "AL"
            },
            "2": {
                "name": "Alaska",
                "code": "AK"
            },
            "4": {
                "name": "Arizona",
                "code": "AZ"
            },
            "5": {
                "name": "Arkansas",
                "code": "AR"
            },
            "6": {
                "name": "California",
                "code": "CA"
            },
            "8": {
                "name": "Colorado",
                "code": "CO"
            },
            "9": {
                "name": "Connecticut",
                "code": "CT"
            },
            "10": {
                "name": "Delaware",
                "code": "DE"
            },
            "11": {
                "name": "District of Columbia",
                "code": "DC"
            },
            "12": {
                "name": "Florida",
                "code": "FL"
            },
            "13": {
                "name": "Georgia",
                "code": "GA"
            },
            "15": {
                "name": "Hawaii",
                "code": "HI"
            },
            "16": {
                "name": "Idaho",
                "code": "ID"
            },
            "17": {
                "name": "Illinois",
                "code": "IL"
            },
            "18": {
                "name": "Indiana",
                "code": "IN"
            },
            "19": {
                "name": "Iowa",
                "code": "IA"
            },
            "20": {
                "name": "Kansas",
                "code": "KS"
            },
            "21": {
                "name": "Kentucky",
                "code": "KY"
            },
            "22": {
                "name": "Louisiana",
                "code": "LA"
            },
            "23": {
                "name": "Maine",
                "code": "ME"
            },
            "24": {
                "name": "Maryland",
                "code": "MD"
            },
            "25": {
                "name": "Massachusetts",
                "code": "MA"
            },
            "26": {
                "name": "Michigan",
                "code": "MI"
            },
            "27": {
                "name": "Minnesota",
                "code": "MN"
            },
            "28": {
                "name": "Mississippi",
                "code": "MS"
            },
            "29": {
                "name": "Missouri",
                "code": "MO"
            },
            "30": {
                "name": "Montana",
                "code": "MT"
            },
            "31": {
                "name": "Nebraska",
                "code": "NE"
            },
            "32": {
                "name": "Nevada",
                "code": "NV"
            },
            "33": {
                "name": "New Hampshire",
                "code": "NH"
            },
            "34": {
                "name": "New Jersey",
                "code": "NJ"
            },
            "35": {
                "name": "New Mexico",
                "code": "NM"
            },
            "36": {
                "name": "New York",
                "code": "NY"
            },
            "37": {
                "name": "North Carolina",
                "code": "NC"
            },
            "38": {
                "name": "North Dakota",
                "code": "ND"
            },
            "39": {
                "name": "Ohio",
                "code": "OH"
            },
            "40": {
                "name": "Oklahoma",
                "code": "OK"
            },
            "41": {
                "name": "Oregon",
                "code": "OR"
            },
            "42": {
                "name": "Pennsylvania",
                "code": "PA"
            },
            "44": {
                "name": "Rhode Island",
                "code": "RI"
            },
            "45": {
                "name": "South Carolina",
                "code": "SC"
            },
            "46": {
                "name": "South Dakota",
                "code": "SD"
            },
            "47": {
                "name": "Tennessee",
                "code": "TN"
            },
            "48": {
                "name": "Texas",
                "code": "TX"
            },
            "49": {
                "name": "Utah",
                "code": "UT"
            },
            "50": {
                "name": "Vermont",
                "code": "VT"
            },
            "51": {
                "name": "Virginia",
                "code": "VA"
            },
            "53": {
                "name": "Washington",
                "code": "WA"
            },
            "54": {
                "name": "West Virginia",
                "code": "WV"
            },
            "55": {
                "name": "Wisconsin",
                "code": "WI"
            },
            "56": {
                "name": "Wyoming",
                "code": "WY"
            },
            "60": {
                "name": "American Samoa",
                "code": "AS"
            },
            "66": {
                "name": "Guam",
                "code": "GU"
            },
            "69": {
                "name": "Northern Mariana Islands",
                "code": "MP"
            },
            "72": {
                "name": "Puerto Rico",
                "code": "PR"
            },
            "78": {
                "name": "Virgin Islands",
                "code": "VI"
            }
        },
        countyNames: {
            "1001": "AUTAUGA",
            "1003": "BALDWIN",
            "1005": "BARBOUR",
            "1007": "BIBB",
            "1009": "BLOUNT",
            "1011": "BULLOCK",
            "1013": "BUTLER",
            "1015": "CALHOUN",
            "1017": "CHAMBERS",
            "1019": "CHEROKEE",
            "1021": "CHILTON",
            "1023": "CHOCTAW",
            "1025": "CLARKE",
            "1027": "CLAY",
            "1029": "CLEBURNE",
            "1031": "COFFEE",
            "1033": "COLBERT",
            "1035": "CONECUH",
            "1037": "COOSA",
            "1039": "COVINGTON",
            "1041": "CRENSHAW",
            "1043": "CULLMAN",
            "1045": "DALE",
            "1047": "DALLAS",
            "1049": "DEKALB",
            "1051": "ELMORE",
            "1053": "ESCAMBIA",
            "1055": "ETOWAH",
            "1057": "FAYETTE",
            "1059": "FRANKLIN",
            "1061": "GENEVA",
            "1063": "GREENE",
            "1065": "HALE",
            "1067": "HENRY",
            "1069": "HOUSTON",
            "1071": "JACKSON",
            "1073": "JEFFERSON",
            "1075": "LAMAR",
            "1077": "LAUDERDALE",
            "1079": "LAWRENCE",
            "1081": "LEE",
            "1083": "LIMESTONE",
            "1085": "LOWNDES",
            "1087": "MACON",
            "1089": "MADISON",
            "1091": "MARENGO",
            "1093": "MARION",
            "1095": "MARSHALL",
            "1097": "MOBILE",
            "1099": "MONROE",
            "1101": "MONTGOMERY",
            "1103": "MORGAN",
            "1105": "PERRY",
            "1107": "PICKENS",
            "1109": "PIKE",
            "1111": "RANDOLPH",
            "1113": "RUSSELL",
            "1115": "ST. CLAIR",
            "1117": "SHELBY",
            "1119": "SUMTER",
            "1121": "TALLADEGA",
            "1123": "TALLAPOOSA",
            "1125": "TUSCALOOSA",
            "1127": "WALKER",
            "1129": "WASHINGTON",
            "1131": "WILCOX",
            "1133": "WINSTON",
            "2013": "ALEUTIANS EAST",
            "2016": "ALEUTIANS WEST",
            "2020": "ANCHORAGE",
            "2050": "BETHEL",
            "2060": "BRISTOL BAY",
            "2068": "DENALI",
            "2070": "DILLINGHAM",
            "2090": "FAIRBANKS",
            "2100": "HAINES",
            "2110": "JUNEAU",
            "2122": "KENAI",
            "2130": "KETCHIKAN GATEWAY",
            "2150": "KODIAK ISLAND",
            "2164": "LAKE AND PENINSULA",
            "2170": "MATANUSKA-SUSITNA BOROUGH",
            "2180": "NOME",
            "2185": "NORTH SLOPE",
            "2188": "NORTHWEST ARCTIC",
            "2201": "PRINCE OF WALES-OUTER KETCHIKAN",
            "2220": "SITKA",
            "2232": "SKAGWAY-HOONAH-ANGOON",
            "2240": "SOUTHEAST FAIRBANKS",
            "2261": "VALDEZ-CORDOVA",
            "2270": "WADE HAMPTON",
            "2280": "WRANGELL-PETERSBURG",
            "2282": "YAKUTAT",
            "2290": "YUKON-KOYUKUK",
            "4001": "APACHE",
            "4003": "COCHISE",
            "4005": "COCONINO",
            "4007": "GILA",
            "4009": "GRAHAM",
            "4011": "GREENLEE",
            "4012": "LA PAZ",
            "4013": "MARICOPA",
            "4015": "MOHAVE",
            "4017": "NAVAJO",
            "4019": "PIMA",
            "4021": "PINAL",
            "4023": "SANTA CRUZ",
            "4025": "YAVAPAI",
            "4027": "YUMA",
            "5001": "ARKANSAS",
            "5003": "ASHLEY",
            "5005": "BAXTER",
            "5007": "BENTON",
            "5009": "BOONE",
            "5011": "BRADLEY",
            "5013": "CALHOUN",
            "5015": "CARROLL",
            "5017": "CHICOT",
            "5019": "CLARK",
            "5021": "CLAY",
            "5023": "CLEBURNE",
            "5025": "CLEVELAND",
            "5027": "COLUMBIA",
            "5029": "CONWAY",
            "5031": "CRAIGHEAD",
            "5033": "CRAWFORD",
            "5035": "CRITTENDEN",
            "5037": "CROSS",
            "5039": "DALLAS",
            "5041": "DESHA",
            "5043": "DREW",
            "5045": "FAULKNER",
            "5047": "FRANKLIN",
            "5049": "FULTON",
            "5051": "GARLAND",
            "5053": "GRANT",
            "5055": "GREENE",
            "5057": "HEMPSTEAD",
            "5059": "HOT SPRING",
            "5061": "HOWARD",
            "5063": "INDEPENDENCE",
            "5065": "IZARD",
            "5067": "JACKSON",
            "5069": "JEFFERSON",
            "5071": "JOHNSON",
            "5073": "LAFAYETTE",
            "5075": "LAWRENCE",
            "5077": "LEE",
            "5079": "LINCOLN",
            "5081": "LITTLE RIVER",
            "5083": "LOGAN",
            "5085": "LONOKE",
            "5087": "MADISON",
            "5089": "MARION",
            "5091": "MILLER",
            "5093": "MISSISSIPPI",
            "5095": "MONROE",
            "5097": "MONTGOMERY",
            "5099": "NEVADA",
            "5101": "NEWTON",
            "5103": "OUACHITA",
            "5105": "PERRY",
            "5107": "PHILLIPS",
            "5109": "PIKE",
            "5111": "POINSETT",
            "5113": "POLK",
            "5115": "POPE",
            "5117": "PRAIRIE",
            "5119": "PULASKI",
            "5121": "RANDOLPH",
            "5123": "ST. FRANCIS",
            "5125": "SALINE",
            "5127": "SCOTT",
            "5129": "SEARCY",
            "5131": "SEBASTIAN",
            "5133": "SEVIER",
            "5135": "SHARP",
            "5137": "STONE",
            "5139": "UNION",
            "5141": "VAN BUREN",
            "5143": "WASHINGTON",
            "5145": "WHITE",
            "5147": "WOODRUFF",
            "5149": "YELL",
            "6001": "ALAMEDA",
            "6003": "ALPINE",
            "6005": "AMADOR",
            "6007": "BUTTE",
            "6009": "CALAVERAS",
            "6011": "COLUSA",
            "6013": "CONTRA COSTA",
            "6015": "DEL NORTE",
            "6017": "EL DORADO",
            "6019": "FRESNO",
            "6021": "GLENN",
            "6023": "HUMBOLDT",
            "6025": "IMPERIAL",
            "6027": "INYO",
            "6029": "KERN",
            "6031": "KINGS",
            "6033": "LAKE",
            "6035": "LASSEN",
            "6037": "LOS ANGELES",
            "6039": "MADERA",
            "6041": "MARIN",
            "6043": "MARIPOSA",
            "6045": "MENDOCINO",
            "6047": "MERCED",
            "6049": "MODOC",
            "6051": "MONO",
            "6053": "MONTEREY",
            "6055": "NAPA",
            "6057": "NEVADA",
            "6059": "ORANGE",
            "6061": "PLACER",
            "6063": "PLUMAS",
            "6065": "RIVERSIDE",
            "6067": "SACRAMENTO",
            "6069": "SAN BENITO",
            "6071": "SAN BERNARDINO",
            "6073": "SAN DIEGO",
            "6075": "SAN FRANCISCO",
            "6077": "SAN JOAQUIN",
            "6079": "SAN LUIS OBISPO",
            "6081": "SAN MATEO",
            "6083": "SANTA BARBARA",
            "6085": "SANTA CLARA",
            "6087": "SANTA CRUZ",
            "6089": "SHASTA",
            "6091": "SIERRA",
            "6093": "SISKIYOU",
            "6095": "SOLANO",
            "6097": "SONOMA",
            "6099": "STANISLAUS",
            "6101": "SUTTER",
            "6103": "TEHAMA",
            "6105": "TRINITY",
            "6107": "TULARE",
            "6109": "TUOLUMNE",
            "6111": "VENTURA",
            "6113": "YOLO",
            "6115": "YUBA",
            "8001": "ADAMS",
            "8003": "ALAMOSA",
            "8005": "ARAPAHOE",
            "8007": "ARCHULETA",
            "8009": "BACA",
            "8011": "BENT",
            "8013": "BOULDER",
            "8014": "BROOMFIELD",
            "8015": "CHAFFEE",
            "8017": "CHEYENNE",
            "8019": "CLEAR CREEK",
            "8021": "CONEJOS",
            "8023": "COSTILLA",
            "8025": "CROWLEY",
            "8027": "CUSTER",
            "8029": "DELTA",
            "8031": "DENVER",
            "8033": "DOLORES",
            "8035": "DOUGLAS",
            "8037": "EAGLE",
            "8039": "ELBERT",
            "8041": "EL PASO",
            "8043": "FREMONT",
            "8045": "GARFIELD",
            "8047": "GILPIN",
            "8049": "GRAND",
            "8051": "GUNNISON",
            "8053": "HINSDALE",
            "8055": "HUERFANO",
            "8057": "JACKSON",
            "8059": "JEFFERSON",
            "8061": "KIOWA",
            "8063": "KIT CARSON",
            "8065": "LAKE",
            "8067": "LA PLATA",
            "8069": "LARIMER",
            "8071": "LAS ANIMAS",
            "8073": "LINCOLN",
            "8075": "LOGAN",
            "8077": "MESA",
            "8079": "MINERAL",
            "8081": "MOFFAT",
            "8083": "MONTEZUMA",
            "8085": "MONTROSE",
            "8087": "MORGAN",
            "8089": "OTERO",
            "8091": "OURAY",
            "8093": "PARK",
            "8095": "PHILLIPS",
            "8097": "PITKIN",
            "8099": "PROWERS",
            "8101": "PUEBLO",
            "8103": "RIO BLANCO",
            "8105": "RIO GRANDE",
            "8107": "ROUTT",
            "8109": "SAGUACHE",
            "8111": "SAN JUAN",
            "8113": "SAN MIGUEL",
            "8115": "SEDGWICK",
            "8117": "SUMMIT",
            "8119": "TELLER",
            "8121": "WASHINGTON",
            "8123": "WELD",
            "8125": "YUMA",
            "9001": "FAIRFIELD",
            "9003": "HARTFORD",
            "9005": "LITCHFIELD",
            "9007": "MIDDLESEX",
            "9009": "NEW HAVEN",
            "9011": "NEW LONDON",
            "9013": "TOLLAND",
            "9015": "WINDHAM",
            "10001": "KENT",
            "10003": "NEW CASTLE",
            "10005": "SUSSEX",
            "11001": "DISTRICT OF COLUMBIA",
            "12001": "ALACHUA",
            "12003": "BAKER",
            "12005": "BAY",
            "12007": "BRADFORD",
            "12009": "BREVARD",
            "12011": "BROWARD",
            "12013": "CALHOUN",
            "12015": "CHARLOTTE",
            "12017": "CITRUS",
            "12019": "CLAY",
            "12021": "COLLIER",
            "12023": "COLUMBIA",
            "12025": "DADE",
            "12027": "DESOTO",
            "12029": "DIXIE",
            "12031": "DUVAL",
            "12033": "ESCAMBIA",
            "12035": "FLAGLER",
            "12037": "FRANKLIN",
            "12039": "GADSDEN",
            "12041": "GILCHRIST",
            "12043": "GLADES",
            "12045": "GULF",
            "12047": "HAMILTON",
            "12049": "HARDEE",
            "12051": "HENDRY",
            "12053": "HERNANDO",
            "12055": "HIGHLANDS",
            "12057": "HILLSBOROUGH",
            "12059": "HOLMES",
            "12061": "INDIAN RIVER",
            "12063": "JACKSON",
            "12065": "JEFFERSON",
            "12067": "LAFAYETTE",
            "12069": "LAKE",
            "12071": "LEE",
            "12073": "LEON",
            "12075": "LEVY",
            "12077": "LIBERTY",
            "12079": "MADISON",
            "12081": "MANATEE",
            "12083": "MARION",
            "12085": "MARTIN",
            "12086": "MIAMI-DADE",
            "12087": "MONROE",
            "12089": "NASSAU",
            "12091": "OKALOOSA",
            "12093": "OKEECHOBEE",
            "12095": "ORANGE",
            "12097": "OSCEOLA",
            "12099": "PALM BEACH",
            "12101": "PASCO",
            "12103": "PINELLAS",
            "12105": "POLK",
            "12107": "PUTNAM",
            "12109": "ST. JOHNS",
            "12111": "ST. LUCIE",
            "12113": "SANTA ROSA",
            "12115": "SARASOTA",
            "12117": "SEMINOLE",
            "12119": "SUMTER",
            "12121": "SUWANNEE",
            "12123": "TAYLOR",
            "12125": "UNION",
            "12127": "VOLUSIA",
            "12129": "WAKULLA",
            "12131": "WALTON",
            "12133": "WASHINGTON",
            "13001": "APPLING",
            "13003": "ATKINSON",
            "13005": "BACON",
            "13007": "BAKER",
            "13009": "BALDWIN",
            "13011": "BANKS",
            "13013": "BARROW",
            "13015": "BARTOW",
            "13017": "BEN HILL",
            "13019": "BERRIEN",
            "13021": "BIBB",
            "13023": "BLECKLEY",
            "13025": "BRANTLEY",
            "13027": "BROOKS",
            "13029": "BRYAN",
            "13031": "BULLOCH",
            "13033": "BURKE",
            "13035": "BUTTS",
            "13037": "CALHOUN",
            "13039": "CAMDEN",
            "13043": "CANDLER",
            "13045": "CARROLL",
            "13047": "CATOOSA",
            "13049": "CHARLTON",
            "13051": "CHATHAM",
            "13053": "CHATTAHOOCHEE",
            "13055": "CHATTOOGA",
            "13057": "CHEROKEE",
            "13059": "CLARKE",
            "13061": "CLAY",
            "13063": "CLAYTON",
            "13065": "CLINCH",
            "13067": "COBB",
            "13069": "COFFEE",
            "13071": "COLQUITT",
            "13073": "COLUMBIA",
            "13075": "COOK",
            "13077": "COWETA",
            "13079": "CRAWFORD",
            "13081": "CRISP",
            "13083": "DADE",
            "13085": "DAWSON",
            "13087": "DECATUR",
            "13089": "DEKALB",
            "13091": "DODGE",
            "13093": "DOOLY",
            "13095": "DOUGHERTY",
            "13097": "DOUGLAS",
            "13099": "EARLY",
            "13101": "ECHOLS",
            "13103": "EFFINGHAM",
            "13105": "ELBERT",
            "13107": "EMANUEL",
            "13109": "EVANS",
            "13111": "FANNIN",
            "13113": "FAYETTE",
            "13115": "FLOYD",
            "13117": "FORSYTH",
            "13119": "FRANKLIN",
            "13121": "FULTON",
            "13123": "GILMER",
            "13125": "GLASCOCK",
            "13127": "GLYNN",
            "13129": "GORDON",
            "13131": "GRADY",
            "13133": "GREENE",
            "13135": "GWINNETT",
            "13137": "HABERSHAM",
            "13139": "HALL",
            "13141": "HANCOCK",
            "13143": "HARALSON",
            "13145": "HARRIS",
            "13147": "HART",
            "13149": "HEARD",
            "13151": "HENRY",
            "13153": "HOUSTON",
            "13155": "IRWIN",
            "13157": "JACKSON",
            "13159": "JASPER",
            "13161": "JEFF DAVIS",
            "13163": "JEFFERSON",
            "13165": "JENKINS",
            "13167": "JOHNSON",
            "13169": "JONES",
            "13171": "LAMAR",
            "13173": "LANIER",
            "13175": "LAURENS",
            "13177": "LEE",
            "13179": "LIBERTY",
            "13181": "LINCOLN",
            "13183": "LONG",
            "13185": "LOWNDES",
            "13187": "LUMPKIN",
            "13189": "MCDUFFIE",
            "13191": "MCINTOSH",
            "13193": "MACON",
            "13195": "MADISON",
            "13197": "MARION",
            "13199": "MERIWETHER",
            "13201": "MILLER",
            "13205": "MITCHELL",
            "13207": "MONROE",
            "13209": "MONTGOMERY",
            "13211": "MORGAN",
            "13213": "MURRAY",
            "13215": "MUSCOGEE",
            "13217": "NEWTON",
            "13219": "OCONEE",
            "13221": "OGLETHORPE",
            "13223": "PAULDING",
            "13225": "PEACH",
            "13227": "PICKENS",
            "13229": "PIERCE",
            "13231": "PIKE",
            "13233": "POLK",
            "13235": "PULASKI",
            "13237": "PUTNAM",
            "13239": "QUITMAN",
            "13241": "RABUN",
            "13243": "RANDOLPH",
            "13245": "RICHMOND",
            "13247": "ROCKDALE",
            "13249": "SCHLEY",
            "13251": "SCREVEN",
            "13253": "SEMINOLE",
            "13255": "SPALDING",
            "13257": "STEPHENS",
            "13259": "STEWART",
            "13261": "SUMTER",
            "13263": "TALBOT",
            "13265": "TALIAFERRO",
            "13267": "TATTNALL",
            "13269": "TAYLOR",
            "13271": "TELFAIR",
            "13273": "TERRELL",
            "13275": "THOMAS",
            "13277": "TIFT",
            "13279": "TOOMBS",
            "13281": "TOWNS",
            "13283": "TREUTLEN",
            "13285": "TROUP",
            "13287": "TURNER",
            "13289": "TWIGGS",
            "13291": "UNION",
            "13293": "UPSON",
            "13295": "WALKER",
            "13297": "WALTON",
            "13299": "WARE",
            "13301": "WARREN",
            "13303": "WASHINGTON",
            "13305": "WAYNE",
            "13307": "WEBSTER",
            "13309": "WHEELER",
            "13311": "WHITE",
            "13313": "WHITFIELD",
            "13315": "WILCOX",
            "13317": "WILKES",
            "13319": "WILKINSON",
            "13321": "WORTH",
            "15001": "HAWAII",
            "15003": "HONOLULU",
            "15005": "KALAWAO",
            "15007": "KAUAI",
            "15009": "MAUI",
            "16001": "ADA",
            "16003": "ADAMS",
            "16005": "BANNOCK",
            "16007": "BEAR LAKE",
            "16009": "BENEWAH",
            "16011": "BINGHAM",
            "16013": "BLAINE",
            "16015": "BOISE",
            "16017": "BONNER",
            "16019": "BONNEVILLE",
            "16021": "BOUNDARY",
            "16023": "BUTTE",
            "16025": "CAMAS",
            "16027": "CANYON",
            "16029": "CARIBOU",
            "16031": "CASSIA",
            "16033": "CLARK",
            "16035": "CLEARWATER",
            "16037": "CUSTER",
            "16039": "ELMORE",
            "16041": "FRANKLIN",
            "16043": "FREMONT",
            "16045": "GEM",
            "16047": "GOODING",
            "16049": "IDAHO",
            "16051": "JEFFERSON",
            "16053": "JEROME",
            "16055": "KOOTENAI",
            "16057": "LATAH",
            "16059": "LEMHI",
            "16061": "LEWIS",
            "16063": "LINCOLN",
            "16065": "MADISON",
            "16067": "MINIDOKA",
            "16069": "NEZ PERCE",
            "16071": "ONEIDA",
            "16073": "OWYHEE",
            "16075": "PAYETTE",
            "16077": "POWER",
            "16079": "SHOSHONE",
            "16081": "TETON",
            "16083": "TWIN FALLS",
            "16085": "VALLEY",
            "16087": "WASHINGTON",
            "17001": "ADAMS",
            "17003": "ALEXANDER",
            "17005": "BOND",
            "17007": "BOONE",
            "17009": "BROWN",
            "17011": "BUREAU",
            "17013": "CALHOUN",
            "17015": "CARROLL",
            "17017": "CASS",
            "17019": "CHAMPAIGN",
            "17021": "CHRISTIAN",
            "17023": "CLARK",
            "17025": "CLAY",
            "17027": "CLINTON",
            "17029": "COLES",
            "17031": "COOK",
            "17033": "CRAWFORD",
            "17035": "CUMBERLAND",
            "17037": "DEKALB",
            "17039": "DE WITT",
            "17041": "DOUGLAS",
            "17043": "DUPAGE",
            "17045": "EDGAR",
            "17047": "EDWARDS",
            "17049": "EFFINGHAM",
            "17051": "FAYETTE",
            "17053": "FORD",
            "17055": "FRANKLIN",
            "17057": "FULTON",
            "17059": "GALLATIN",
            "17061": "GREENE",
            "17063": "GRUNDY",
            "17065": "HAMILTON",
            "17067": "HANCOCK",
            "17069": "HARDIN",
            "17071": "HENDERSON",
            "17073": "HENRY",
            "17075": "IROQUOIS",
            "17077": "JACKSON",
            "17079": "JASPER",
            "17081": "JEFFERSON",
            "17083": "JERSEY",
            "17085": "JO DAVIESS",
            "17087": "JOHNSON",
            "17089": "KANE",
            "17091": "KANKAKEE",
            "17093": "KENDALL",
            "17095": "KNOX",
            "17097": "LAKE",
            "17099": "LASALLE",
            "17101": "LAWRENCE",
            "17103": "LEE",
            "17105": "LIVINGSTON",
            "17107": "LOGAN",
            "17109": "MCDONOUGH",
            "17111": "MCHENRY",
            "17113": "MCLEAN",
            "17115": "MACON",
            "17117": "MACOUPIN",
            "17119": "MADISON",
            "17121": "MARION",
            "17123": "MARSHALL",
            "17125": "MASON",
            "17127": "MASSAC",
            "17129": "MENARD",
            "17131": "MERCER",
            "17133": "MONROE",
            "17135": "MONTGOMERY",
            "17137": "MORGAN",
            "17139": "MOULTRIE",
            "17141": "OGLE",
            "17143": "PEORIA",
            "17145": "PERRY",
            "17147": "PIATT",
            "17149": "PIKE",
            "17151": "POPE",
            "17153": "PULASKI",
            "17155": "PUTNAM",
            "17157": "RANDOLPH",
            "17159": "RICHLAND",
            "17161": "ROCK ISLAND",
            "17163": "ST. CLAIR",
            "17165": "SALINE",
            "17167": "SANGAMON",
            "17169": "SCHUYLER",
            "17171": "SCOTT",
            "17173": "SHELBY",
            "17175": "STARK",
            "17177": "STEPHENSON",
            "17179": "TAZEWELL",
            "17181": "UNION",
            "17183": "VERMILION",
            "17185": "WABASH",
            "17187": "WARREN",
            "17189": "WASHINGTON",
            "17191": "WAYNE",
            "17193": "WHITE",
            "17195": "WHITESIDE",
            "17197": "WILL",
            "17199": "WILLIAMSON",
            "17201": "WINNEBAGO",
            "17203": "WOODFORD",
            "18001": "ADAMS",
            "18003": "ALLEN",
            "18005": "BARTHOLOMEW",
            "18007": "BENTON",
            "18009": "BLACKFORD",
            "18011": "BOONE",
            "18013": "BROWN",
            "18015": "CARROLL",
            "18017": "CASS",
            "18019": "CLARK",
            "18021": "CLAY",
            "18023": "CLINTON",
            "18025": "CRAWFORD",
            "18027": "DAVIESS",
            "18029": "DEARBORN",
            "18031": "DECATUR",
            "18033": "DEKALB",
            "18035": "DELAWARE",
            "18037": "DUBOIS",
            "18039": "ELKHART",
            "18041": "FAYETTE",
            "18043": "FLOYD",
            "18045": "FOUNTAIN",
            "18047": "FRANKLIN",
            "18049": "FULTON",
            "18051": "GIBSON",
            "18053": "GRANT",
            "18055": "GREENE",
            "18057": "HAMILTON",
            "18059": "HANCOCK",
            "18061": "HARRISON",
            "18063": "HENDRICKS",
            "18065": "HENRY",
            "18067": "HOWARD",
            "18069": "HUNTINGTON",
            "18071": "JACKSON",
            "18073": "JASPER",
            "18075": "JAY",
            "18077": "JEFFERSON",
            "18079": "JENNINGS",
            "18081": "JOHNSON",
            "18083": "KNOX",
            "18085": "KOSCIUSKO",
            "18087": "LAGRANGE",
            "18089": "LAKE",
            "18091": "LAPORTE",
            "18093": "LAWRENCE",
            "18095": "MADISON",
            "18097": "MARION",
            "18099": "MARSHALL",
            "18101": "MARTIN",
            "18103": "MIAMI",
            "18105": "MONROE",
            "18107": "MONTGOMERY",
            "18109": "MORGAN",
            "18111": "NEWTON",
            "18113": "NOBLE",
            "18115": "OHIO",
            "18117": "ORANGE",
            "18119": "OWEN",
            "18121": "PARKE",
            "18123": "PERRY",
            "18125": "PIKE",
            "18127": "PORTER",
            "18129": "POSEY",
            "18131": "PULASKI",
            "18133": "PUTNAM",
            "18135": "RANDOLPH",
            "18137": "RIPLEY",
            "18139": "RUSH",
            "18141": "ST. JOSEPH",
            "18143": "SCOTT",
            "18145": "SHELBY",
            "18147": "SPENCER",
            "18149": "STARKE",
            "18151": "STEUBEN",
            "18153": "SULLIVAN",
            "18155": "SWITZERLAND",
            "18157": "TIPPECANOE",
            "18159": "TIPTON",
            "18161": "UNION",
            "18163": "VANDERBURGH",
            "18165": "VERMILLION",
            "18167": "VIGO",
            "18169": "WABASH",
            "18171": "WARREN",
            "18173": "WARRICK",
            "18175": "WASHINGTON",
            "18177": "WAYNE",
            "18179": "WELLS",
            "18181": "WHITE",
            "18183": "WHITLEY",
            "19001": "ADAIR",
            "19003": "ADAMS",
            "19005": "ALLAMAKEE",
            "19007": "APPANOOSE",
            "19009": "AUDUBON",
            "19011": "BENTON",
            "19013": "BLACK HAWK",
            "19015": "BOONE",
            "19017": "BREMER",
            "19019": "BUCHANAN",
            "19021": "BUENA VISTA",
            "19023": "BUTLER",
            "19025": "CALHOUN",
            "19027": "CARROLL",
            "19029": "CASS",
            "19031": "CEDAR",
            "19033": "CERRO GORDO",
            "19035": "CHEROKEE",
            "19037": "CHICKASAW",
            "19039": "CLARKE",
            "19041": "CLAY",
            "19043": "CLAYTON",
            "19045": "CLINTON",
            "19047": "CRAWFORD",
            "19049": "DALLAS",
            "19051": "DAVIS",
            "19053": "DECATUR",
            "19055": "DELAWARE",
            "19057": "DES MOINES",
            "19059": "DICKINSON",
            "19061": "DUBUQUE",
            "19063": "EMMET",
            "19065": "FAYETTE",
            "19067": "FLOYD",
            "19069": "FRANKLIN",
            "19071": "FREMONT",
            "19073": "GREENE",
            "19075": "GRUNDY",
            "19077": "GUTHRIE",
            "19079": "HAMILTON",
            "19081": "HANCOCK",
            "19083": "HARDIN",
            "19085": "HARRISON",
            "19087": "HENRY",
            "19089": "HOWARD",
            "19091": "HUMBOLDT",
            "19093": "IDA",
            "19095": "IOWA",
            "19097": "JACKSON",
            "19099": "JASPER",
            "19101": "JEFFERSON",
            "19103": "JOHNSON",
            "19105": "JONES",
            "19107": "KEOKUK",
            "19109": "KOSSUTH",
            "19111": "LEE",
            "19113": "LINN",
            "19115": "LOUISA",
            "19117": "LUCAS",
            "19119": "LYON",
            "19121": "MADISON",
            "19123": "MAHASKA",
            "19125": "MARION",
            "19127": "MARSHALL",
            "19129": "MILLS",
            "19131": "MITCHELL",
            "19133": "MONONA",
            "19135": "MONROE",
            "19137": "MONTGOMERY",
            "19139": "MUSCATINE",
            "19141": "O'BRIEN",
            "19143": "OSCEOLA",
            "19145": "PAGE",
            "19147": "PALO ALTO",
            "19149": "PLYMOUTH",
            "19151": "POCAHONTAS",
            "19153": "POLK",
            "19155": "POTTAWATTAMIE",
            "19157": "POWESHIEK",
            "19159": "RINGGOLD",
            "19161": "SAC",
            "19163": "SCOTT",
            "19165": "SHELBY",
            "19167": "SIOUX",
            "19169": "STORY",
            "19171": "TAMA",
            "19173": "TAYLOR",
            "19175": "UNION",
            "19177": "VAN BUREN",
            "19179": "WAPELLO",
            "19181": "WARREN",
            "19183": "WASHINGTON",
            "19185": "WAYNE",
            "19187": "WEBSTER",
            "19189": "WINNEBAGO",
            "19191": "WINNESHIEK",
            "19193": "WOODBURY",
            "19195": "WORTH",
            "19197": "WRIGHT",
            "20001": "ALLEN",
            "20003": "ANDERSON",
            "20005": "ATCHISON",
            "20007": "BARBER",
            "20009": "BARTON",
            "20011": "BOURBON",
            "20013": "BROWN",
            "20015": "BUTLER",
            "20017": "CHASE",
            "20019": "CHAUTAUQUA",
            "20021": "CHEROKEE",
            "20023": "CHEYENNE",
            "20025": "CLARK",
            "20027": "CLAY",
            "20029": "CLOUD",
            "20031": "COFFEY",
            "20033": "COMANCHE",
            "20035": "COWLEY",
            "20037": "CRAWFORD",
            "20039": "DECATUR",
            "20041": "DICKINSON",
            "20043": "DONIPHAN",
            "20045": "DOUGLAS",
            "20047": "EDWARDS",
            "20049": "ELK",
            "20051": "ELLIS",
            "20053": "ELLSWORTH",
            "20055": "FINNEY",
            "20057": "FORD",
            "20059": "FRANKLIN",
            "20061": "GEARY",
            "20063": "GOVE",
            "20065": "GRAHAM",
            "20067": "GRANT",
            "20069": "GRAY",
            "20071": "GREELEY",
            "20073": "GREENWOOD",
            "20075": "HAMILTON",
            "20077": "HARPER",
            "20079": "HARVEY",
            "20081": "HASKELL",
            "20083": "HODGEMAN",
            "20085": "JACKSON",
            "20087": "JEFFERSON",
            "20089": "JEWELL",
            "20091": "JOHNSON",
            "20093": "KEARNY",
            "20095": "KINGMAN",
            "20097": "KIOWA",
            "20099": "LABETTE",
            "20101": "LANE",
            "20103": "LEAVENWORTH",
            "20105": "LINCOLN",
            "20107": "LINN",
            "20109": "LOGAN",
            "20111": "LYON",
            "20113": "MCPHERSON",
            "20115": "MARION",
            "20117": "MARSHALL",
            "20119": "MEADE",
            "20121": "MIAMI",
            "20123": "MITCHELL",
            "20125": "MONTGOMERY",
            "20127": "MORRIS",
            "20129": "MORTON",
            "20131": "NEMAHA",
            "20133": "NEOSHO",
            "20135": "NESS",
            "20137": "NORTON",
            "20139": "OSAGE",
            "20141": "OSBORNE",
            "20143": "OTTAWA",
            "20145": "PAWNEE",
            "20147": "PHILLIPS",
            "20149": "POTTAWATOMIE",
            "20151": "PRATT",
            "20153": "RAWLINS",
            "20155": "RENO",
            "20157": "REPUBLIC",
            "20159": "RICE",
            "20161": "RILEY",
            "20163": "ROOKS",
            "20165": "RUSH",
            "20167": "RUSSELL",
            "20169": "SALINE",
            "20171": "SCOTT",
            "20173": "SEDGWICK",
            "20175": "SEWARD",
            "20177": "SHAWNEE",
            "20179": "SHERIDAN",
            "20181": "SHERMAN",
            "20183": "SMITH",
            "20185": "STAFFORD",
            "20187": "STANTON",
            "20189": "STEVENS",
            "20191": "SUMNER",
            "20193": "THOMAS",
            "20195": "TREGO",
            "20197": "WABAUNSEE",
            "20199": "WALLACE",
            "20201": "WASHINGTON",
            "20203": "WICHITA",
            "20205": "WILSON",
            "20207": "WOODSON",
            "20209": "WYANDOTTE",
            "21001": "ADAIR",
            "21003": "ALLEN",
            "21005": "ANDERSON",
            "21007": "BALLARD",
            "21009": "BARREN",
            "21011": "BATH",
            "21013": "BELL",
            "21015": "BOONE",
            "21017": "BOURBON",
            "21019": "BOYD",
            "21021": "BOYLE",
            "21023": "BRACKEN",
            "21025": "BREATHITT",
            "21027": "BRECKINRIDGE",
            "21029": "BULLITT",
            "21031": "BUTLER",
            "21033": "CALDWELL",
            "21035": "CALLOWAY",
            "21037": "CAMPBELL",
            "21039": "CARLISLE",
            "21041": "CARROLL",
            "21043": "CARTER",
            "21045": "CASEY",
            "21047": "CHRISTIAN",
            "21049": "CLARK",
            "21051": "CLAY",
            "21053": "CLINTON",
            "21055": "CRITTENDEN",
            "21057": "CUMBERLAND",
            "21059": "DAVIESS",
            "21061": "EDMONSON",
            "21063": "ELLIOTT",
            "21065": "ESTILL",
            "21067": "FAYETTE",
            "21069": "FLEMING",
            "21071": "FLOYD",
            "21073": "FRANKLIN",
            "21075": "FULTON",
            "21077": "GALLATIN",
            "21079": "GARRARD",
            "21081": "GRANT",
            "21083": "GRAVES",
            "21085": "GRAYSON",
            "21087": "GREEN",
            "21089": "GREENUP",
            "21091": "HANCOCK",
            "21093": "HARDIN",
            "21095": "HARLAN",
            "21097": "HARRISON",
            "21099": "HART",
            "21101": "HENDERSON",
            "21103": "HENRY",
            "21105": "HICKMAN",
            "21107": "HOPKINS",
            "21109": "JACKSON",
            "21111": "JEFFERSON",
            "21113": "JESSAMINE",
            "21115": "JOHNSON",
            "21117": "KENTON",
            "21119": "KNOTT",
            "21121": "KNOX",
            "21123": "LARUE",
            "21125": "LAUREL",
            "21127": "LAWRENCE",
            "21129": "LEE",
            "21131": "LESLIE",
            "21133": "LETCHER",
            "21135": "LEWIS",
            "21137": "LINCOLN",
            "21139": "LIVINGSTON",
            "21141": "LOGAN",
            "21143": "LYON",
            "21145": "MCCRACKEN",
            "21147": "MCCREARY",
            "21149": "MCLEAN",
            "21151": "MADISON",
            "21153": "MAGOFFIN",
            "21155": "MARION",
            "21157": "MARSHALL",
            "21159": "MARTIN",
            "21161": "MASON",
            "21163": "MEADE",
            "21165": "MENIFEE",
            "21167": "MERCER",
            "21169": "METCALFE",
            "21171": "MONROE",
            "21173": "MONTGOMERY",
            "21175": "MORGAN",
            "21177": "MUHLENBERG",
            "21179": "NELSON",
            "21181": "NICHOLAS",
            "21183": "OHIO",
            "21185": "OLDHAM",
            "21187": "OWEN",
            "21189": "OWSLEY",
            "21191": "PENDLETON",
            "21193": "PERRY",
            "21195": "PIKE",
            "21197": "POWELL",
            "21199": "PULASKI",
            "21201": "ROBERTSON",
            "21203": "ROCKCASTLE",
            "21205": "ROWAN",
            "21207": "RUSSELL",
            "21209": "SCOTT",
            "21211": "SHELBY",
            "21213": "SIMPSON",
            "21215": "SPENCER",
            "21217": "TAYLOR",
            "21219": "TODD",
            "21221": "TRIGG",
            "21223": "TRIMBLE",
            "21225": "UNION",
            "21227": "WARREN",
            "21229": "WASHINGTON",
            "21231": "WAYNE",
            "21233": "WEBSTER",
            "21235": "WHITLEY",
            "21237": "WOLFE",
            "21239": "WOODFORD",
            "22001": "ACADIA",
            "22003": "ALLEN",
            "22005": "ASCENSION",
            "22007": "ASSUMPTION",
            "22009": "AVOYELLES",
            "22011": "BEAUREGARD",
            "22013": "BIENVILLE",
            "22015": "BOSSIER",
            "22017": "CADDO",
            "22019": "CALCASIEU",
            "22021": "CALDWELL",
            "22023": "CAMERON",
            "22025": "CATAHOULA",
            "22027": "CLAIBORNE",
            "22029": "CONCORDIA",
            "22031": "DE SOTO",
            "22033": "EAST BATON ROUGE",
            "22035": "EAST CARROLL",
            "22037": "EAST FELICIANA",
            "22039": "EVANGELINE",
            "22041": "FRANKLIN",
            "22043": "GRANT",
            "22045": "IBERIA",
            "22047": "IBERVILLE",
            "22049": "JACKSON",
            "22051": "JEFFERSON",
            "22053": "JEFFERSON DAVIS",
            "22055": "LAFAYETTE",
            "22057": "LAFOURCHE",
            "22059": "LA SALLE",
            "22061": "LINCOLN",
            "22063": "LIVINGSTON",
            "22065": "MADISON",
            "22067": "MOREHOUSE",
            "22069": "NATCHITOCHES",
            "22071": "ORLEANS",
            "22073": "OUACHITA",
            "22075": "PLAQUEMINES",
            "22077": "POINTE COUPEE",
            "22079": "RAPIDES",
            "22081": "RED RIVER",
            "22083": "RICHLAND",
            "22085": "SABINE",
            "22087": "ST. BERNARD",
            "22089": "ST. CHARLES",
            "22091": "ST. HELENA",
            "22093": "ST. JAMES",
            "22095": "ST. JOHN THE BAPTIST",
            "22097": "ST. LANDRY",
            "22099": "ST. MARTIN",
            "22101": "ST. MARY",
            "22103": "ST. TAMMANY",
            "22105": "TANGIPAHOA",
            "22107": "TENSAS",
            "22109": "TERREBONNE",
            "22111": "UNION",
            "22113": "VERMILION",
            "22115": "VERNON",
            "22117": "WASHINGTON",
            "22119": "WEBSTER",
            "22121": "WEST BATON ROUGE",
            "22123": "WEST CARROLL",
            "22125": "WEST FELICIANA",
            "22127": "WINN",
            "23001": "ANDROSCOGGIN",
            "23003": "AROOSTOOK",
            "23005": "CUMBERLAND",
            "23007": "FRANKLIN",
            "23009": "HANCOCK",
            "23011": "KENNEBEC",
            "23013": "KNOX",
            "23015": "LINCOLN",
            "23017": "OXFORD",
            "23019": "PENOBSCOT",
            "23021": "PISCATAQUIS",
            "23023": "SAGADAHOC",
            "23025": "SOMERSET",
            "23027": "WALDO",
            "23029": "WASHINGTON",
            "23031": "YORK",
            "24001": "ALLEGANY",
            "24003": "ANNE ARUNDEL",
            "24005": "BALTIMORE",
            "24009": "CALVERT",
            "24011": "CAROLINE",
            "24013": "CARROLL",
            "24015": "CECIL",
            "24017": "CHARLES",
            "24019": "DORCHESTER",
            "24021": "FREDERICK",
            "24023": "GARRETT",
            "24025": "HARFORD",
            "24027": "HOWARD",
            "24029": "KENT",
            "24031": "MONTGOMERY",
            "24033": "PRINCE GEORGES",
            "24035": "QUEEN ANNES",
            "24037": "ST. MARY'S",
            "24039": "SOMERSET",
            "24041": "TALBOT",
            "24043": "WASHINGTON",
            "24045": "WICOMICO",
            "24047": "WORCESTER",
            "24510": "BALTIMORE CITY",
            "25001": "BARNSTABLE",
            "25003": "BERKSHIRE",
            "25005": "BRISTOL",
            "25007": "DUKES",
            "25009": "ESSEX",
            "25011": "FRANKLIN",
            "25013": "HAMPDEN",
            "25015": "HAMPSHIRE",
            "25017": "MIDDLESEX",
            "25019": "NANTUCKET",
            "25021": "NORFOLK",
            "25023": "PLYMOUTH",
            "25025": "SUFFOLK",
            "25027": "WORCESTER",
            "26001": "ALCONA",
            "26003": "ALGER",
            "26005": "ALLEGAN",
            "26007": "ALPENA",
            "26009": "ANTRIM",
            "26011": "ARENAC",
            "26013": "BARAGA",
            "26015": "BARRY",
            "26017": "BAY",
            "26019": "BENZIE",
            "26021": "BERRIEN",
            "26023": "BRANCH",
            "26025": "CALHOUN",
            "26027": "CASS",
            "26029": "CHARLEVOIX",
            "26031": "CHEBOYGAN",
            "26033": "CHIPPEWA",
            "26035": "CLARE",
            "26037": "CLINTON",
            "26039": "CRAWFORD",
            "26041": "DELTA",
            "26043": "DICKINSON",
            "26045": "EATON",
            "26047": "EMMET",
            "26049": "GENESEE",
            "26051": "GLADWIN",
            "26053": "GOGEBIC",
            "26055": "GRAND TRAVERSE",
            "26057": "GRATIOT",
            "26059": "HILLSDALE",
            "26061": "HOUGHTON",
            "26063": "HURON",
            "26065": "INGHAM",
            "26067": "IONIA",
            "26069": "IOSCO",
            "26071": "IRON",
            "26073": "ISABELLA",
            "26075": "JACKSON",
            "26077": "KALAMAZOO",
            "26079": "KALKASKA",
            "26081": "KENT",
            "26083": "KEWEENAW",
            "26085": "LAKE",
            "26087": "LAPEER",
            "26089": "LEELANAU",
            "26091": "LENAWEE",
            "26093": "LIVINGSTON",
            "26095": "LUCE",
            "26097": "MACKINAC",
            "26099": "MACOMB",
            "26101": "MANISTEE",
            "26103": "MARQUETTE",
            "26105": "MASON",
            "26107": "MECOSTA",
            "26109": "MENOMINEE",
            "26111": "MIDLAND",
            "26113": "MISSAUKEE",
            "26115": "MONROE",
            "26117": "MONTCALM",
            "26119": "MONTMORENCY",
            "26121": "MUSKEGON",
            "26123": "NEWAYGO",
            "26125": "OAKLAND",
            "26127": "OCEANA",
            "26129": "OGEMAW",
            "26131": "ONTONAGON",
            "26133": "OSCEOLA",
            "26135": "OSCODA",
            "26137": "OTSEGO",
            "26139": "OTTAWA",
            "26141": "PRESQUE ISLE",
            "26143": "ROSCOMMON",
            "26145": "SAGINAW",
            "26147": "ST. CLAIR",
            "26149": "ST. JOSEPH",
            "26151": "SANILAC",
            "26153": "SCHOOLCRAFT",
            "26155": "SHIAWASSEE",
            "26157": "TUSCOLA",
            "26159": "VAN BUREN",
            "26161": "WASHTENAW",
            "26163": "WAYNE",
            "26165": "WEXFORD",
            "27001": "AITKIN",
            "27003": "ANOKA",
            "27005": "BECKER",
            "27007": "BELTRAMI",
            "27009": "BENTON",
            "27011": "BIG STONE",
            "27013": "BLUE EARTH",
            "27015": "BROWN",
            "27017": "CARLTON",
            "27019": "CARVER",
            "27021": "CASS",
            "27023": "CHIPPEWA",
            "27025": "CHISAGO",
            "27027": "CLAY",
            "27029": "CLEARWATER",
            "27031": "COOK",
            "27033": "COTTONWOOD",
            "27035": "CROW WING",
            "27037": "DAKOTA",
            "27039": "DODGE",
            "27041": "DOUGLAS",
            "27043": "FARIBAULT",
            "27045": "FILLMORE",
            "27047": "FREEBORN",
            "27049": "GOODHUE",
            "27051": "GRANT",
            "27053": "HENNEPIN",
            "27055": "HOUSTON",
            "27057": "HUBBARD",
            "27059": "ISANTI",
            "27061": "ITASCA",
            "27063": "JACKSON",
            "27065": "KANABEC",
            "27067": "KANDIYOHI",
            "27069": "KITTSON",
            "27071": "KOOCHICHING",
            "27073": "LAC QUI PARLE",
            "27075": "LAKE",
            "27077": "LAKE OF THE WOODS",
            "27079": "LE SUEUR",
            "27081": "LINCOLN",
            "27083": "LYON",
            "27085": "MCLEOD",
            "27087": "MAHNOMEN",
            "27089": "MARSHALL",
            "27091": "MARTIN",
            "27093": "MEEKER",
            "27095": "MILLE LACS",
            "27097": "MORRISON",
            "27099": "MOWER",
            "27101": "MURRAY",
            "27103": "NICOLLET",
            "27105": "NOBLES",
            "27107": "NORMAN",
            "27109": "OLMSTED",
            "27111": "OTTER TAIL",
            "27113": "PENNINGTON",
            "27115": "PINE",
            "27117": "PIPESTONE",
            "27119": "POLK",
            "27121": "POPE",
            "27123": "RAMSEY",
            "27125": "RED LAKE",
            "27127": "REDWOOD",
            "27129": "RENVILLE",
            "27131": "RICE",
            "27133": "ROCK",
            "27135": "ROSEAU",
            "27137": "ST. LOUIS",
            "27139": "SCOTT",
            "27141": "SHERBURNE",
            "27143": "SIBLEY",
            "27145": "STEARNS",
            "27147": "STEELE",
            "27149": "STEVENS",
            "27151": "SWIFT",
            "27153": "TODD",
            "27155": "TRAVERSE",
            "27157": "WABASHA",
            "27159": "WADENA",
            "27161": "WASECA",
            "27163": "WASHINGTON",
            "27165": "WATONWAN",
            "27167": "WILKIN",
            "27169": "WINONA",
            "27171": "WRIGHT",
            "27173": "YELLOW MEDICINE",
            "28001": "ADAMS",
            "28003": "ALCORN",
            "28005": "AMITE",
            "28007": "ATTALA",
            "28009": "BENTON",
            "28011": "BOLIVAR",
            "28013": "CALHOUN",
            "28015": "CARROLL",
            "28017": "CHICKASAW",
            "28019": "CHOCTAW",
            "28021": "CLAIBORNE",
            "28023": "CLARKE",
            "28025": "CLAY",
            "28027": "COAHOMA",
            "28029": "COPIAH",
            "28031": "COVINGTON",
            "28033": "DESOTO",
            "28035": "FORREST",
            "28037": "FRANKLIN",
            "28039": "GEORGE",
            "28041": "GREENE",
            "28043": "GRENADA",
            "28045": "HANCOCK",
            "28047": "HARRISON",
            "28049": "HINDS",
            "28051": "HOLMES",
            "28053": "HUMPHREYS",
            "28055": "ISSAQUENA",
            "28057": "ITAWAMBA",
            "28059": "JACKSON",
            "28061": "JASPER",
            "28063": "JEFFERSON",
            "28065": "JEFFERSON DAVIS",
            "28067": "JONES",
            "28069": "KEMPER",
            "28071": "LAFAYETTE",
            "28073": "LAMAR",
            "28075": "LAUDERDALE",
            "28077": "LAWRENCE",
            "28079": "LEAKE",
            "28081": "LEE",
            "28083": "LEFLORE",
            "28085": "LINCOLN",
            "28087": "LOWNDES",
            "28089": "MADISON",
            "28091": "MARION",
            "28093": "MARSHALL",
            "28095": "MONROE",
            "28097": "MONTGOMERY",
            "28099": "NESHOBA",
            "28101": "NEWTON",
            "28103": "NOXUBEE",
            "28105": "OKTIBBEHA",
            "28107": "PANOLA",
            "28109": "PEARL RIVER",
            "28111": "PERRY",
            "28113": "PIKE",
            "28115": "PONTOTOC",
            "28117": "PRENTISS",
            "28119": "QUITMAN",
            "28121": "RANKIN",
            "28123": "SCOTT",
            "28125": "SHARKEY",
            "28127": "SIMPSON",
            "28129": "SMITH",
            "28131": "STONE",
            "28133": "SUNFLOWER",
            "28135": "TALLAHATCHIE",
            "28137": "TATE",
            "28139": "TIPPAH",
            "28141": "TISHOMINGO",
            "28143": "TUNICA",
            "28145": "UNION",
            "28147": "WALTHALL",
            "28149": "WARREN",
            "28151": "WASHINGTON",
            "28153": "WAYNE",
            "28155": "WEBSTER",
            "28157": "WILKINSON",
            "28159": "WINSTON",
            "28161": "YALOBUSHA",
            "28163": "YAZOO",
            "29001": "ADAIR",
            "29003": "ANDREW",
            "29005": "ATCHISON",
            "29007": "AUDRAIN",
            "29009": "BARRY",
            "29011": "BARTON",
            "29013": "BATES",
            "29015": "BENTON",
            "29017": "BOLLINGER",
            "29019": "BOONE",
            "29021": "BUCHANAN",
            "29023": "BUTLER",
            "29025": "CALDWELL",
            "29027": "CALLAWAY",
            "29029": "CAMDEN",
            "29031": "CAPE GIRARDEAU",
            "29033": "CARROLL",
            "29035": "CARTER",
            "29037": "CASS",
            "29039": "CEDAR",
            "29041": "CHARITON",
            "29043": "CHRISTIAN",
            "29045": "CLARK",
            "29047": "CLAY",
            "29049": "CLINTON",
            "29051": "COLE",
            "29053": "COOPER",
            "29055": "CRAWFORD",
            "29057": "DADE",
            "29059": "DALLAS",
            "29061": "DAVIESS",
            "29063": "DEKALB",
            "29065": "DENT",
            "29067": "DOUGLAS",
            "29069": "DUNKLIN",
            "29071": "FRANKLIN",
            "29073": "GASCONADE",
            "29075": "GENTRY",
            "29077": "GREENE",
            "29079": "GRUNDY",
            "29081": "HARRISON",
            "29083": "HENRY",
            "29085": "HICKORY",
            "29087": "HOLT",
            "29089": "HOWARD",
            "29091": "HOWELL",
            "29093": "IRON",
            "29095": "JACKSON",
            "29097": "JASPER",
            "29099": "JEFFERSON",
            "29101": "JOHNSON",
            "29103": "KNOX",
            "29105": "LACLEDE",
            "29107": "LAFAYETTE",
            "29109": "LAWRENCE",
            "29111": "LEWIS",
            "29113": "LINCOLN",
            "29115": "LINN",
            "29117": "LIVINGSTON",
            "29119": "MCDONALD",
            "29121": "MACON",
            "29123": "MADISON",
            "29125": "MARIES",
            "29127": "MARION",
            "29129": "MERCER",
            "29131": "MILLER",
            "29133": "MISSISSIPPI",
            "29135": "MONITEAU",
            "29137": "MONROE",
            "29139": "MONTGOMERY",
            "29141": "MORGAN",
            "29143": "NEW MADRID",
            "29145": "NEWTON",
            "29147": "NODAWAY",
            "29149": "OREGON",
            "29151": "OSAGE",
            "29153": "OZARK",
            "29155": "PEMISCOT",
            "29157": "PERRY",
            "29159": "PETTIS",
            "29161": "PHELPS",
            "29163": "PIKE",
            "29165": "PLATTE",
            "29167": "POLK",
            "29169": "PULASKI",
            "29171": "PUTNAM",
            "29173": "RALLS",
            "29175": "RANDOLPH",
            "29177": "RAY",
            "29179": "REYNOLDS",
            "29181": "RIPLEY",
            "29183": "ST. CHARLES",
            "29185": "ST. CLAIR",
            "29186": "STE. GENEVIEVE",
            "29187": "ST. FRANCOIS",
            "29189": "ST. LOUIS",
            "29195": "SALINE",
            "29197": "SCHUYLER",
            "29199": "SCOTLAND",
            "29201": "SCOTT",
            "29203": "SHANNON",
            "29205": "SHELBY",
            "29207": "STODDARD",
            "29209": "STONE",
            "29211": "SULLIVAN",
            "29213": "TANEY",
            "29215": "TEXAS",
            "29217": "VERNON",
            "29219": "WARREN",
            "29221": "WASHINGTON",
            "29223": "WAYNE",
            "29225": "WEBSTER",
            "29227": "WORTH",
            "29229": "WRIGHT",
            "29510": "SAINT LOUIS CITY",
            "30001": "BEAVERHEAD",
            "30003": "BIG HORN",
            "30005": "BLAINE",
            "30007": "BROADWATER",
            "30009": "CARBON",
            "30011": "CARTER",
            "30013": "CASCADE",
            "30015": "CHOUTEAU",
            "30017": "CUSTER",
            "30019": "DANIELS",
            "30021": "DAWSON",
            "30023": "DEER LODGE",
            "30025": "FALLON",
            "30027": "FERGUS",
            "30029": "FLATHEAD",
            "30031": "GALLATIN",
            "30033": "GARFIELD",
            "30035": "GLACIER",
            "30037": "GOLDEN VALLEY",
            "30039": "GRANITE",
            "30041": "HILL",
            "30043": "JEFFERSON",
            "30045": "JUDITH BASIN",
            "30047": "LAKE",
            "30049": "LEWIS AND CLARK",
            "30051": "LIBERTY",
            "30053": "LINCOLN",
            "30055": "MCCONE",
            "30057": "MADISON",
            "30059": "MEAGHER",
            "30061": "MINERAL",
            "30063": "MISSOULA",
            "30065": "MUSSELSHELL",
            "30067": "PARK",
            "30069": "PETROLEUM",
            "30071": "PHILLIPS",
            "30073": "PONDERA",
            "30075": "POWDER RIVER",
            "30077": "POWELL",
            "30079": "PRAIRIE",
            "30081": "RAVALLI",
            "30083": "RICHLAND",
            "30085": "ROOSEVELT",
            "30087": "ROSEBUD",
            "30089": "SANDERS",
            "30091": "SHERIDAN",
            "30093": "SILVER BOW",
            "30095": "STILLWATER",
            "30097": "SWEET GRASS",
            "30099": "TETON",
            "30101": "TOOLE",
            "30103": "TREASURE",
            "30105": "VALLEY",
            "30107": "WHEATLAND",
            "30109": "WIBAUX",
            "30111": "YELLOWSTONE",
            "31001": "ADAMS",
            "31003": "ANTELOPE",
            "31005": "ARTHUR",
            "31007": "BANNER",
            "31009": "BLAINE",
            "31011": "BOONE",
            "31013": "BOX BUTTE",
            "31015": "BOYD",
            "31017": "BROWN",
            "31019": "BUFFALO",
            "31021": "BURT",
            "31023": "BUTLER",
            "31025": "CASS",
            "31027": "CEDAR",
            "31029": "CHASE",
            "31031": "CHERRY",
            "31033": "CHEYENNE",
            "31035": "CLAY",
            "31037": "COLFAX",
            "31039": "CUMING",
            "31041": "CUSTER",
            "31043": "DAKOTA",
            "31045": "DAWES",
            "31047": "DAWSON",
            "31049": "DEUEL",
            "31051": "DIXON",
            "31053": "DODGE",
            "31055": "DOUGLAS",
            "31057": "DUNDY",
            "31059": "FILLMORE",
            "31061": "FRANKLIN",
            "31063": "FRONTIER",
            "31065": "FURNAS",
            "31067": "GAGE",
            "31069": "GARDEN",
            "31071": "GARFIELD",
            "31073": "GOSPER",
            "31075": "GRANT",
            "31077": "GREELEY",
            "31079": "HALL",
            "31081": "HAMILTON",
            "31083": "HARLAN",
            "31085": "HAYES",
            "31087": "HITCHCOCK",
            "31089": "HOLT",
            "31091": "HOOKER",
            "31093": "HOWARD",
            "31095": "JEFFERSON",
            "31097": "JOHNSON",
            "31099": "KEARNEY",
            "31101": "KEITH",
            "31103": "KEYA PAHA",
            "31105": "KIMBALL",
            "31107": "KNOX",
            "31109": "LANCASTER",
            "31111": "LINCOLN",
            "31113": "LOGAN",
            "31115": "LOUP",
            "31117": "MCPHERSON",
            "31119": "MADISON",
            "31121": "MERRICK",
            "31123": "MORRILL",
            "31125": "NANCE",
            "31127": "NEMAHA",
            "31129": "NUCKOLLS",
            "31131": "OTOE",
            "31133": "PAWNEE",
            "31135": "PERKINS",
            "31137": "PHELPS",
            "31139": "PIERCE",
            "31141": "PLATTE",
            "31143": "POLK",
            "31145": "RED WILLOW",
            "31147": "RICHARDSON",
            "31149": "ROCK",
            "31151": "SALINE",
            "31153": "SARPY",
            "31155": "SAUNDERS",
            "31157": "SCOTTS BLUFF",
            "31159": "SEWARD",
            "31161": "SHERIDAN",
            "31163": "SHERMAN",
            "31165": "SIOUX",
            "31167": "STANTON",
            "31169": "THAYER",
            "31171": "THOMAS",
            "31173": "THURSTON",
            "31175": "VALLEY",
            "31177": "WASHINGTON",
            "31179": "WAYNE",
            "31181": "WEBSTER",
            "31183": "WHEELER",
            "31185": "YORK",
            "32001": "CHURCHILL",
            "32003": "CLARK",
            "32005": "DOUGLAS",
            "32007": "ELKO",
            "32009": "ESMERALDA",
            "32011": "EUREKA",
            "32013": "HUMBOLDT",
            "32015": "LANDER",
            "32017": "LINCOLN",
            "32019": "LYON",
            "32021": "MINERAL",
            "32023": "NYE",
            "32027": "PERSHING",
            "32029": "STOREY",
            "32031": "WASHOE",
            "32033": "WHITE PINE",
            "32510": "CARSON CITY",
            "33001": "BELKNAP",
            "33003": "CARROLL",
            "33005": "CHESHIRE",
            "33007": "COOS",
            "33009": "GRAFTON",
            "33011": "HILLSBOROUGH",
            "33013": "MERRIMACK",
            "33015": "ROCKINGHAM",
            "33017": "STRAFFORD",
            "33019": "SULLIVAN",
            "34001": "ATLANTIC",
            "34003": "BERGEN",
            "34005": "BURLINGTON",
            "34007": "CAMDEN",
            "34009": "CAPE MAY",
            "34011": "CUMBERLAND",
            "34013": "ESSEX",
            "34015": "GLOUCESTER",
            "34017": "HUDSON",
            "34019": "HUNTERDON",
            "34021": "MERCER",
            "34023": "MIDDLESEX",
            "34025": "MONMOUTH",
            "34027": "MORRIS",
            "34029": "OCEAN",
            "34031": "PASSAIC",
            "34033": "SALEM",
            "34035": "SOMERSET",
            "34037": "SUSSEX",
            "34039": "UNION",
            "34041": "WARREN",
            "35001": "BERNALILLO",
            "35003": "CATRON",
            "35005": "CHAVES",
            "35006": "CIBOLA",
            "35007": "COLFAX",
            "35009": "CURRY",
            "35011": "DE BACA",
            "35013": "DONA ANA",
            "35015": "EDDY",
            "35017": "GRANT",
            "35019": "GUADALUPE",
            "35021": "HARDING",
            "35023": "HIDALGO",
            "35025": "LEA",
            "35027": "LINCOLN",
            "35028": "LOS ALAMOS",
            "35029": "LUNA",
            "35031": "MCKINLEY",
            "35033": "MORA",
            "35035": "OTERO",
            "35037": "QUAY",
            "35039": "RIO ARRIBA",
            "35041": "ROOSEVELT",
            "35043": "SANDOVAL",
            "35045": "SAN JUAN",
            "35047": "SAN MIGUEL",
            "35049": "SANTA FE",
            "35051": "SIERRA",
            "35053": "SOCORRO",
            "35055": "TAOS",
            "35057": "TORRANCE",
            "35059": "UNION",
            "35061": "VALENCIA",
            "36001": "ALBANY",
            "36003": "ALLEGANY",
            "36005": "BRONX",
            "36007": "BROOME",
            "36009": "CATTARAUGUS",
            "36011": "CAYUGA",
            "36013": "CHAUTAUQUA",
            "36015": "CHEMUNG",
            "36017": "CHENANGO",
            "36019": "CLINTON",
            "36021": "COLUMBIA",
            "36023": "CORTLAND",
            "36025": "DELAWARE",
            "36027": "DUTCHESS",
            "36029": "ERIE",
            "36031": "ESSEX",
            "36033": "FRANKLIN",
            "36035": "FULTON",
            "36037": "GENESEE",
            "36039": "GREENE",
            "36041": "HAMILTON",
            "36043": "HERKIMER",
            "36045": "JEFFERSON",
            "36047": "KINGS",
            "36049": "LEWIS",
            "36051": "LIVINGSTON",
            "36053": "MADISON",
            "36055": "MONROE",
            "36057": "MONTGOMERY",
            "36059": "NASSAU",
            "36061": "NEW YORK",
            "36063": "NIAGARA",
            "36065": "ONEIDA",
            "36067": "ONONDAGA",
            "36069": "ONTARIO",
            "36071": "ORANGE",
            "36073": "ORLEANS",
            "36075": "OSWEGO",
            "36077": "OTSEGO",
            "36079": "PUTNAM",
            "36081": "QUEENS",
            "36083": "RENSSELAER",
            "36085": "RICHMOND",
            "36087": "ROCKLAND",
            "36089": "ST. LAWRENCE",
            "36091": "SARATOGA",
            "36093": "SCHENECTADY",
            "36095": "SCHOHARIE",
            "36097": "SCHUYLER",
            "36099": "SENECA",
            "36101": "STEUBEN",
            "36103": "SUFFOLK",
            "36105": "SULLIVAN",
            "36107": "TIOGA",
            "36109": "TOMPKINS",
            "36111": "ULSTER",
            "36113": "WARREN",
            "36115": "WASHINGTON",
            "36117": "WAYNE",
            "36119": "WESTCHESTER",
            "36121": "WYOMING",
            "36123": "YATES",
            "37001": "ALAMANCE",
            "37003": "ALEXANDER",
            "37005": "ALLEGHANY",
            "37007": "ANSON",
            "37009": "ASHE",
            "37011": "AVERY",
            "37013": "BEAUFORT",
            "37015": "BERTIE",
            "37017": "BLADEN",
            "37019": "BRUNSWICK",
            "37021": "BUNCOMBE",
            "37023": "BURKE",
            "37025": "CABARRUS",
            "37027": "CALDWELL",
            "37029": "CAMDEN",
            "37031": "CARTERET",
            "37033": "CASWELL",
            "37035": "CATAWBA",
            "37037": "CHATHAM",
            "37039": "CHEROKEE",
            "37041": "CHOWAN",
            "37043": "CLAY",
            "37045": "CLEVELAND",
            "37047": "COLUMBUS",
            "37049": "CRAVEN",
            "37051": "CUMBERLAND",
            "37053": "CURRITUCK",
            "37055": "DARE",
            "37057": "DAVIDSON",
            "37059": "DAVIE",
            "37061": "DUPLIN",
            "37063": "DURHAM",
            "37065": "EDGECOMBE",
            "37067": "FORSYTH",
            "37069": "FRANKLIN",
            "37071": "GASTON",
            "37073": "GATES",
            "37075": "GRAHAM",
            "37077": "GRANVILLE",
            "37079": "GREENE",
            "37081": "GUILFORD",
            "37083": "HALIFAX",
            "37085": "HARNETT",
            "37087": "HAYWOOD",
            "37089": "HENDERSON",
            "37091": "HERTFORD",
            "37093": "HOKE",
            "37095": "HYDE",
            "37097": "IREDELL",
            "37099": "JACKSON",
            "37101": "JOHNSTON",
            "37103": "JONES",
            "37105": "LEE",
            "37107": "LENOIR",
            "37109": "LINCOLN",
            "37111": "MCDOWELL",
            "37113": "MACON",
            "37115": "MADISON",
            "37117": "MARTIN",
            "37119": "MECKLENBURG",
            "37121": "MITCHELL",
            "37123": "MONTGOMERY",
            "37125": "MOORE",
            "37127": "NASH",
            "37129": "NEW HANOVER",
            "37131": "NORTHAMPTON",
            "37133": "ONSLOW",
            "37135": "ORANGE",
            "37137": "PAMLICO",
            "37139": "PASQUOTANK",
            "37141": "PENDER",
            "37143": "PERQUIMANS",
            "37145": "PERSON",
            "37147": "PITT",
            "37149": "POLK",
            "37151": "RANDOLPH",
            "37153": "RICHMOND",
            "37155": "ROBESON",
            "37157": "ROCKINGHAM",
            "37159": "ROWAN",
            "37161": "RUTHERFORD",
            "37163": "SAMPSON",
            "37165": "SCOTLAND",
            "37167": "STANLY",
            "37169": "STOKES",
            "37171": "SURRY",
            "37173": "SWAIN",
            "37175": "TRANSYLVANIA",
            "37177": "TYRRELL",
            "37179": "UNION",
            "37181": "VANCE",
            "37183": "WAKE",
            "37185": "WARREN",
            "37187": "WASHINGTON",
            "37189": "WATAUGA",
            "37191": "WAYNE",
            "37193": "WILKES",
            "37195": "WILSON",
            "37197": "YADKIN",
            "37199": "YANCEY",
            "38001": "ADAMS",
            "38003": "BARNES",
            "38005": "BENSON",
            "38007": "BILLINGS",
            "38009": "BOTTINEAU",
            "38011": "BOWMAN",
            "38013": "BURKE",
            "38015": "BURLEIGH",
            "38017": "CASS",
            "38019": "CAVALIER",
            "38021": "DICKEY",
            "38023": "DIVIDE",
            "38025": "DUNN",
            "38027": "EDDY",
            "38029": "EMMONS",
            "38031": "FOSTER",
            "38033": "GOLDEN VALLEY",
            "38035": "GRAND FORKS",
            "38037": "GRANT",
            "38039": "GRIGGS",
            "38041": "HETTINGER",
            "38043": "KIDDER",
            "38045": "LAMOURE",
            "38047": "LOGAN",
            "38049": "MCHENRY",
            "38051": "MCINTOSH",
            "38053": "MCKENZIE",
            "38055": "MCLEAN",
            "38057": "MERCER",
            "38059": "MORTON",
            "38061": "MOUNTRAIL",
            "38063": "NELSON",
            "38065": "OLIVER",
            "38067": "PEMBINA",
            "38069": "PIERCE",
            "38071": "RAMSEY",
            "38073": "RANSOM",
            "38075": "RENVILLE",
            "38077": "RICHLAND",
            "38079": "ROLETTE",
            "38081": "SARGENT",
            "38083": "SHERIDAN",
            "38085": "SIOUX",
            "38087": "SLOPE",
            "38089": "STARK",
            "38091": "STEELE",
            "38093": "STUTSMAN",
            "38095": "TOWNER",
            "38097": "TRAILL",
            "38099": "WALSH",
            "38101": "WARD",
            "38103": "WELLS",
            "38105": "WILLIAMS",
            "39001": "ADAMS",
            "39003": "ALLEN",
            "39005": "ASHLAND",
            "39007": "ASHTABULA",
            "39009": "ATHENS",
            "39011": "AUGLAIZE",
            "39013": "BELMONT",
            "39015": "BROWN",
            "39017": "BUTLER",
            "39019": "CARROLL",
            "39021": "CHAMPAIGN",
            "39023": "CLARK",
            "39025": "CLERMONT",
            "39027": "CLINTON",
            "39029": "COLUMBIANA",
            "39031": "COSHOCTON",
            "39033": "CRAWFORD",
            "39035": "CUYAHOGA",
            "39037": "DARKE",
            "39039": "DEFIANCE",
            "39041": "DELAWARE",
            "39043": "ERIE",
            "39045": "FAIRFIELD",
            "39047": "FAYETTE",
            "39049": "FRANKLIN",
            "39051": "FULTON",
            "39053": "GALLIA",
            "39055": "GEAUGA",
            "39057": "GREENE",
            "39059": "GUERNSEY",
            "39061": "HAMILTON",
            "39063": "HANCOCK",
            "39065": "HARDIN",
            "39067": "HARRISON",
            "39069": "HENRY",
            "39071": "HIGHLAND",
            "39073": "HOCKING",
            "39075": "HOLMES",
            "39077": "HURON",
            "39079": "JACKSON",
            "39081": "JEFFERSON",
            "39083": "KNOX",
            "39085": "LAKE",
            "39087": "LAWRENCE",
            "39089": "LICKING",
            "39091": "LOGAN",
            "39093": "LORAIN",
            "39095": "LUCAS",
            "39097": "MADISON",
            "39099": "MAHONING",
            "39101": "MARION",
            "39103": "MEDINA",
            "39105": "MEIGS",
            "39107": "MERCER",
            "39109": "MIAMI",
            "39111": "MONROE",
            "39113": "MONTGOMERY",
            "39115": "MORGAN",
            "39117": "MORROW",
            "39119": "MUSKINGUM",
            "39121": "NOBLE",
            "39123": "OTTAWA",
            "39125": "PAULDING",
            "39127": "PERRY",
            "39129": "PICKAWAY",
            "39131": "PIKE",
            "39133": "PORTAGE",
            "39135": "PREBLE",
            "39137": "PUTNAM",
            "39139": "RICHLAND",
            "39141": "ROSS",
            "39143": "SANDUSKY",
            "39145": "SCIOTO",
            "39147": "SENECA",
            "39149": "SHELBY",
            "39151": "STARK",
            "39153": "SUMMIT",
            "39155": "TRUMBULL",
            "39157": "TUSCARAWAS",
            "39159": "UNION",
            "39161": "VAN WERT",
            "39163": "VINTON",
            "39165": "WARREN",
            "39167": "WASHINGTON",
            "39169": "WAYNE",
            "39171": "WILLIAMS",
            "39173": "WOOD",
            "39175": "WYANDOT",
            "40001": "ADAIR",
            "40003": "ALFALFA",
            "40005": "ATOKA",
            "40007": "BEAVER",
            "40009": "BECKHAM",
            "40011": "BLAINE",
            "40013": "BRYAN",
            "40015": "CADDO",
            "40017": "CANADIAN",
            "40019": "CARTER",
            "40021": "CHEROKEE",
            "40023": "CHOCTAW",
            "40025": "CIMARRON",
            "40027": "CLEVELAND",
            "40029": "COAL",
            "40031": "COMANCHE",
            "40033": "COTTON",
            "40035": "CRAIG",
            "40037": "CREEK",
            "40039": "CUSTER",
            "40041": "DELAWARE",
            "40043": "DEWEY",
            "40045": "ELLIS",
            "40047": "GARFIELD",
            "40049": "GARVIN",
            "40051": "GRADY",
            "40053": "GRANT",
            "40055": "GREER",
            "40057": "HARMON",
            "40059": "HARPER",
            "40061": "HASKELL",
            "40063": "HUGHES",
            "40065": "JACKSON",
            "40067": "JEFFERSON",
            "40069": "JOHNSTON",
            "40071": "KAY",
            "40073": "KINGFISHER",
            "40075": "KIOWA",
            "40077": "LATIMER",
            "40079": "LE FLORE",
            "40081": "LINCOLN",
            "40083": "LOGAN",
            "40085": "LOVE",
            "40087": "MCCLAIN",
            "40089": "MCCURTAIN",
            "40091": "MCINTOSH",
            "40093": "MAJOR",
            "40095": "MARSHALL",
            "40097": "MAYES",
            "40099": "MURRAY",
            "40101": "MUSKOGEE",
            "40103": "NOBLE",
            "40105": "NOWATA",
            "40107": "OKFUSKEE",
            "40109": "OKLAHOMA",
            "40111": "OKMULGEE",
            "40113": "OSAGE",
            "40115": "OTTAWA",
            "40117": "PAWNEE",
            "40119": "PAYNE",
            "40121": "PITTSBURG",
            "40123": "PONTOTOC",
            "40125": "POTTAWATOMIE",
            "40127": "PUSHMATAHA",
            "40129": "ROGER MILLS",
            "40131": "ROGERS",
            "40133": "SEMINOLE",
            "40135": "SEQUOYAH",
            "40137": "STEPHENS",
            "40139": "TEXAS",
            "40141": "TILLMAN",
            "40143": "TULSA",
            "40145": "WAGONER",
            "40147": "WASHINGTON",
            "40149": "WASHITA",
            "40151": "WOODS",
            "40153": "WOODWARD",
            "41001": "BAKER",
            "41003": "BENTON",
            "41005": "CLACKAMAS",
            "41007": "CLATSOP",
            "41009": "COLUMBIA",
            "41011": "COOS",
            "41013": "CROOK",
            "41015": "CURRY",
            "41017": "DESCHUTES",
            "41019": "DOUGLAS",
            "41021": "GILLIAM",
            "41023": "GRANT",
            "41025": "HARNEY",
            "41027": "HOOD RIVER",
            "41029": "JACKSON",
            "41031": "JEFFERSON",
            "41033": "JOSEPHINE",
            "41035": "KLAMATH",
            "41037": "LAKE",
            "41039": "LANE",
            "41041": "LINCOLN",
            "41043": "LINN",
            "41045": "MALHEUR",
            "41047": "MARION",
            "41049": "MORROW",
            "41051": "MULTNOMAH",
            "41053": "POLK",
            "41055": "SHERMAN",
            "41057": "TILLAMOOK",
            "41059": "UMATILLA",
            "41061": "UNION",
            "41063": "WALLOWA",
            "41065": "WASCO",
            "41067": "WASHINGTON",
            "41069": "WHEELER",
            "41071": "YAMHILL",
            "42001": "ADAMS",
            "42003": "ALLEGHENY",
            "42005": "ARMSTRONG",
            "42007": "BEAVER",
            "42009": "BEDFORD",
            "42011": "BERKS",
            "42013": "BLAIR",
            "42015": "BRADFORD",
            "42017": "BUCKS",
            "42019": "BUTLER",
            "42021": "CAMBRIA",
            "42023": "CAMERON",
            "42025": "CARBON",
            "42027": "CENTRE",
            "42029": "CHESTER",
            "42031": "CLARION",
            "42033": "CLEARFIELD",
            "42035": "CLINTON",
            "42037": "COLUMBIA",
            "42039": "CRAWFORD",
            "42041": "CUMBERLAND",
            "42043": "DAUPHIN",
            "42045": "DELAWARE",
            "42047": "ELK",
            "42049": "ERIE",
            "42051": "FAYETTE",
            "42053": "FOREST",
            "42055": "FRANKLIN",
            "42057": "FULTON",
            "42059": "GREENE",
            "42061": "HUNTINGDON",
            "42063": "INDIANA",
            "42065": "JEFFERSON",
            "42067": "JUNIATA",
            "42069": "LACKAWANNA",
            "42071": "LANCASTER",
            "42073": "LAWRENCE",
            "42075": "LEBANON",
            "42077": "LEHIGH",
            "42079": "LUZERNE",
            "42081": "LYCOMING",
            "42083": "MCKEAN",
            "42085": "MERCER",
            "42087": "MIFFLIN",
            "42089": "MONROE",
            "42091": "MONTGOMERY",
            "42093": "MONTOUR",
            "42095": "NORTHAMPTON",
            "42097": "NORTHUMBERLAND",
            "42099": "PERRY",
            "42101": "PHILADELPHIA",
            "42103": "PIKE",
            "42105": "POTTER",
            "42107": "SCHUYLKILL",
            "42109": "SNYDER",
            "42111": "SOMERSET",
            "42113": "SULLIVAN",
            "42115": "SUSQUEHANNA",
            "42117": "TIOGA",
            "42119": "UNION",
            "42121": "VENANGO",
            "42123": "WARREN",
            "42125": "WASHINGTON",
            "42127": "WAYNE",
            "42129": "WESTMORELAND",
            "42131": "WYOMING",
            "42133": "YORK",
            "44001": "BRISTOL",
            "44003": "KENT",
            "44005": "NEWPORT",
            "44007": "PROVIDENCE",
            "44009": "WASHINGTON",
            "45001": "ABBEVILLE",
            "45003": "AIKEN",
            "45005": "ALLENDALE",
            "45007": "ANDERSON",
            "45009": "BAMBERG",
            "45011": "BARNWELL",
            "45013": "BEAUFORT",
            "45015": "BERKELEY",
            "45017": "CALHOUN",
            "45019": "CHARLESTON",
            "45021": "CHEROKEE",
            "45023": "CHESTER",
            "45025": "CHESTERFIELD",
            "45027": "CLARENDON",
            "45029": "COLLETON",
            "45031": "DARLINGTON",
            "45033": "DILLON",
            "45035": "DORCHESTER",
            "45037": "EDGEFIELD",
            "45039": "FAIRFIELD",
            "45041": "FLORENCE",
            "45043": "GEORGETOWN",
            "45045": "GREENVILLE",
            "45047": "GREENWOOD",
            "45049": "HAMPTON",
            "45051": "HORRY",
            "45053": "JASPER",
            "45055": "KERSHAW",
            "45057": "LANCASTER",
            "45059": "LAURENS",
            "45061": "LEE",
            "45063": "LEXINGTON",
            "45065": "MCCORMICK",
            "45067": "MARION",
            "45069": "MARLBORO",
            "45071": "NEWBERRY",
            "45073": "OCONEE",
            "45075": "ORANGEBURG",
            "45077": "PICKENS",
            "45079": "RICHLAND",
            "45081": "SALUDA",
            "45083": "SPARTANBURG",
            "45085": "SUMTER",
            "45087": "UNION",
            "45089": "WILLIAMSBURG",
            "45091": "YORK",
            "46003": "AURORA",
            "46005": "BEADLE",
            "46007": "BENNETT",
            "46009": "BON HOMME",
            "46011": "BROOKINGS",
            "46013": "BROWN",
            "46015": "BRULE",
            "46017": "BUFFALO",
            "46019": "BUTTE",
            "46021": "CAMPBELL",
            "46023": "CHARLES MIX",
            "46025": "CLARK",
            "46027": "CLAY",
            "46029": "CODINGTON",
            "46031": "CORSON",
            "46033": "CUSTER",
            "46035": "DAVISON",
            "46037": "DAY",
            "46039": "DEUEL",
            "46041": "DEWEY",
            "46043": "DOUGLAS",
            "46045": "EDMUNDS",
            "46047": "FALL RIVER",
            "46049": "FAULK",
            "46051": "GRANT",
            "46053": "GREGORY",
            "46055": "HAAKON",
            "46057": "HAMLIN",
            "46059": "HAND",
            "46061": "HANSON",
            "46063": "HARDING",
            "46065": "HUGHES",
            "46067": "HUTCHINSON",
            "46069": "HYDE",
            "46071": "JACKSON",
            "46073": "JERAULD",
            "46075": "JONES",
            "46077": "KINGSBURY",
            "46079": "LAKE",
            "46081": "LAWRENCE",
            "46083": "LINCOLN",
            "46085": "LYMAN",
            "46087": "MCCOOK",
            "46089": "MCPHERSON",
            "46091": "MARSHALL",
            "46093": "MEADE",
            "46095": "MELLETTE",
            "46097": "MINER",
            "46099": "MINNEHAHA",
            "46101": "MOODY",
            "46103": "PENNINGTON",
            "46105": "PERKINS",
            "46107": "POTTER",
            "46109": "ROBERTS",
            "46111": "SANBORN",
            "46113": "SHANNON",
            "46115": "SPINK",
            "46117": "STANLEY",
            "46119": "SULLY",
            "46121": "TODD",
            "46123": "TRIPP",
            "46125": "TURNER",
            "46127": "UNION",
            "46129": "WALWORTH",
            "46135": "YANKTON",
            "46137": "ZIEBACH",
            "47001": "ANDERSON",
            "47003": "BEDFORD",
            "47005": "BENTON",
            "47007": "BLEDSOE",
            "47009": "BLOUNT",
            "47011": "BRADLEY",
            "47013": "CAMPBELL",
            "47015": "CANNON",
            "47017": "CARROLL",
            "47019": "CARTER",
            "47021": "CHEATHAM",
            "47023": "CHESTER",
            "47025": "CLAIBORNE",
            "47027": "CLAY",
            "47029": "COCKE",
            "47031": "COFFEE",
            "47033": "CROCKETT",
            "47035": "CUMBERLAND",
            "47037": "DAVIDSON",
            "47039": "DECATUR",
            "47041": "DEKALB",
            "47043": "DICKSON",
            "47045": "DYER",
            "47047": "FAYETTE",
            "47049": "FENTRESS",
            "47051": "FRANKLIN",
            "47053": "GIBSON",
            "47055": "GILES",
            "47057": "GRAINGER",
            "47059": "GREENE",
            "47061": "GRUNDY",
            "47063": "HAMBLEN",
            "47065": "HAMILTON",
            "47067": "HANCOCK",
            "47069": "HARDEMAN",
            "47071": "HARDIN",
            "47073": "HAWKINS",
            "47075": "HAYWOOD",
            "47077": "HENDERSON",
            "47079": "HENRY",
            "47081": "HICKMAN",
            "47083": "HOUSTON",
            "47085": "HUMPHREYS",
            "47087": "JACKSON",
            "47089": "JEFFERSON",
            "47091": "JOHNSON",
            "47093": "KNOX",
            "47095": "LAKE",
            "47097": "LAUDERDALE",
            "47099": "LAWRENCE",
            "47101": "LEWIS",
            "47103": "LINCOLN",
            "47105": "LOUDON",
            "47107": "MCMINN",
            "47109": "MCNAIRY",
            "47111": "MACON",
            "47113": "MADISON",
            "47115": "MARION",
            "47117": "MARSHALL",
            "47119": "MAURY",
            "47121": "MEIGS",
            "47123": "MONROE",
            "47125": "MONTGOMERY",
            "47127": "MOORE",
            "47129": "MORGAN",
            "47131": "OBION",
            "47133": "OVERTON",
            "47135": "PERRY",
            "47137": "PICKETT",
            "47139": "POLK",
            "47141": "PUTNAM",
            "47143": "RHEA",
            "47145": "ROANE",
            "47147": "ROBERTSON",
            "47149": "RUTHERFORD",
            "47151": "SCOTT",
            "47153": "SEQUATCHIE",
            "47155": "SEVIER",
            "47157": "SHELBY",
            "47159": "SMITH",
            "47161": "STEWART",
            "47163": "SULLIVAN",
            "47165": "SUMNER",
            "47167": "TIPTON",
            "47169": "TROUSDALE",
            "47171": "UNICOI",
            "47173": "UNION",
            "47175": "VAN BUREN",
            "47177": "WARREN",
            "47179": "WASHINGTON",
            "47181": "WAYNE",
            "47183": "WEAKLEY",
            "47185": "WHITE",
            "47187": "WILLIAMSON",
            "47189": "WILSON",
            "48001": "ANDERSON",
            "48003": "ANDREWS",
            "48005": "ANGELINA",
            "48007": "ARANSAS",
            "48009": "ARCHER",
            "48011": "ARMSTRONG",
            "48013": "ATASCOSA",
            "48015": "AUSTIN",
            "48017": "BAILEY",
            "48019": "BANDERA",
            "48021": "BASTROP",
            "48023": "BAYLOR",
            "48025": "BEE",
            "48027": "BELL",
            "48029": "BEXAR",
            "48031": "BLANCO",
            "48033": "BORDEN",
            "48035": "BOSQUE",
            "48037": "BOWIE",
            "48039": "BRAZORIA",
            "48041": "BRAZOS",
            "48043": "BREWSTER",
            "48045": "BRISCOE",
            "48047": "BROOKS",
            "48049": "BROWN",
            "48051": "BURLESON",
            "48053": "BURNET",
            "48055": "CALDWELL",
            "48057": "CALHOUN",
            "48059": "CALLAHAN",
            "48061": "CAMERON",
            "48063": "CAMP",
            "48065": "CARSON",
            "48067": "CASS",
            "48069": "CASTRO",
            "48071": "CHAMBERS",
            "48073": "CHEROKEE",
            "48075": "CHILDRESS",
            "48077": "CLAY",
            "48079": "COCHRAN",
            "48081": "COKE",
            "48083": "COLEMAN",
            "48085": "COLLIN",
            "48087": "COLLINGSWORTH",
            "48089": "COLORADO",
            "48091": "COMAL",
            "48093": "COMANCHE",
            "48095": "CONCHO",
            "48097": "COOKE",
            "48099": "CORYELL",
            "48101": "COTTLE",
            "48103": "CRANE",
            "48105": "CROCKETT",
            "48107": "CROSBY",
            "48109": "CULBERSON",
            "48111": "DALLAM",
            "48113": "DALLAS",
            "48115": "DAWSON",
            "48117": "DEAF SMITH",
            "48119": "DELTA",
            "48121": "DENTON",
            "48123": "DEWITT",
            "48125": "DICKENS",
            "48127": "DIMMIT",
            "48129": "DONLEY",
            "48131": "DUVAL",
            "48133": "EASTLAND",
            "48135": "ECTOR",
            "48137": "EDWARDS",
            "48139": "ELLIS",
            "48141": "EL PASO",
            "48143": "ERATH",
            "48145": "FALLS",
            "48147": "FANNIN",
            "48149": "FAYETTE",
            "48151": "FISHER",
            "48153": "FLOYD",
            "48155": "FOARD",
            "48157": "FORT BEND",
            "48159": "FRANKLIN",
            "48161": "FREESTONE",
            "48163": "FRIO",
            "48165": "GAINES",
            "48167": "GALVESTON",
            "48169": "GARZA",
            "48171": "GILLESPIE",
            "48173": "GLASSCOCK",
            "48175": "GOLIAD",
            "48177": "GONZALES",
            "48179": "GRAY",
            "48181": "GRAYSON",
            "48183": "GREGG",
            "48185": "GRIMES",
            "48187": "GUADALUPE",
            "48189": "HALE",
            "48191": "HALL",
            "48193": "HAMILTON",
            "48195": "HANSFORD",
            "48197": "HARDEMAN",
            "48199": "HARDIN",
            "48201": "HARRIS",
            "48203": "HARRISON",
            "48205": "HARTLEY",
            "48207": "HASKELL",
            "48209": "HAYS",
            "48211": "HEMPHILL",
            "48213": "HENDERSON",
            "48215": "HIDALGO",
            "48217": "HILL",
            "48219": "HOCKLEY",
            "48221": "HOOD",
            "48223": "HOPKINS",
            "48225": "HOUSTON",
            "48227": "HOWARD",
            "48229": "HUDSPETH",
            "48231": "HUNT",
            "48233": "HUTCHINSON",
            "48235": "IRION",
            "48237": "JACK",
            "48239": "JACKSON",
            "48241": "JASPER",
            "48243": "JEFF DAVIS",
            "48245": "JEFFERSON",
            "48247": "JIM HOGG",
            "48249": "JIM WELLS",
            "48251": "JOHNSON",
            "48253": "JONES",
            "48255": "KARNES",
            "48257": "KAUFMAN",
            "48259": "KENDALL",
            "48261": "KENEDY",
            "48263": "KENT",
            "48265": "KERR",
            "48267": "KIMBLE",
            "48269": "KING",
            "48271": "KINNEY",
            "48273": "KLEBERG",
            "48275": "KNOX",
            "48277": "LAMAR",
            "48279": "LAMB",
            "48281": "LAMPASAS",
            "48283": "LA SALLE",
            "48285": "LAVACA",
            "48287": "LEE",
            "48289": "LEON",
            "48291": "LIBERTY",
            "48293": "LIMESTONE",
            "48295": "LIPSCOMB",
            "48297": "LIVE OAK",
            "48299": "LLANO",
            "48301": "LOVING",
            "48303": "LUBBOCK",
            "48305": "LYNN",
            "48307": "MCCULLOCH",
            "48309": "MCLENNAN",
            "48311": "MCMULLEN",
            "48313": "MADISON",
            "48315": "MARION",
            "48317": "MARTIN",
            "48319": "MASON",
            "48321": "MATAGORDA",
            "48323": "MAVERICK",
            "48325": "MEDINA",
            "48327": "MENARD",
            "48329": "MIDLAND",
            "48331": "MILAM",
            "48333": "MILLS",
            "48335": "MITCHELL",
            "48337": "MONTAGUE",
            "48339": "MONTGOMERY",
            "48341": "MOORE",
            "48343": "MORRIS",
            "48345": "MOTLEY",
            "48347": "NACOGDOCHES",
            "48349": "NAVARRO",
            "48351": "NEWTON",
            "48353": "NOLAN",
            "48355": "NUECES",
            "48357": "OCHILTREE",
            "48359": "OLDHAM",
            "48361": "ORANGE",
            "48363": "PALO PINTO",
            "48365": "PANOLA",
            "48367": "PARKER",
            "48369": "PARMER",
            "48371": "PECOS",
            "48373": "POLK",
            "48375": "POTTER",
            "48377": "PRESIDIO",
            "48379": "RAINS",
            "48381": "RANDALL",
            "48383": "REAGAN",
            "48385": "REAL",
            "48387": "RED RIVER",
            "48389": "REEVES",
            "48391": "REFUGIO",
            "48393": "ROBERTS",
            "48395": "ROBERTSON",
            "48397": "ROCKWALL",
            "48399": "RUNNELS",
            "48401": "RUSK",
            "48403": "SABINE",
            "48405": "SAN AUGUSTINE",
            "48407": "SAN JACINTO",
            "48409": "SAN PATRICIO",
            "48411": "SAN SABA",
            "48413": "SCHLEICHER",
            "48415": "SCURRY",
            "48417": "SHACKELFORD",
            "48419": "SHELBY",
            "48421": "SHERMAN",
            "48423": "SMITH",
            "48425": "SOMERVELL",
            "48427": "STARR",
            "48429": "STEPHENS",
            "48431": "STERLING",
            "48433": "STONEWALL",
            "48435": "SUTTON",
            "48437": "SWISHER",
            "48439": "TARRANT",
            "48441": "TAYLOR",
            "48443": "TERRELL",
            "48445": "TERRY",
            "48447": "THROCKMORTON",
            "48449": "TITUS",
            "48451": "TOM GREEN",
            "48453": "TRAVIS",
            "48455": "TRINITY",
            "48457": "TYLER",
            "48459": "UPSHUR",
            "48461": "UPTON",
            "48463": "UVALDE",
            "48465": "VAL VERDE",
            "48467": "VAN ZANDT",
            "48469": "VICTORIA",
            "48471": "WALKER",
            "48473": "WALLER",
            "48475": "WARD",
            "48477": "WASHINGTON",
            "48479": "WEBB",
            "48481": "WHARTON",
            "48483": "WHEELER",
            "48485": "WICHITA",
            "48487": "WILBARGER",
            "48489": "WILLACY",
            "48491": "WILLIAMSON",
            "48493": "WILSON",
            "48495": "WINKLER",
            "48497": "WISE",
            "48499": "WOOD",
            "48501": "YOAKUM",
            "48503": "YOUNG",
            "48505": "ZAPATA",
            "48507": "ZAVALA",
            "49001": "BEAVER",
            "49003": "BOX ELDER",
            "49005": "CACHE",
            "49007": "CARBON",
            "49009": "DAGGETT",
            "49011": "DAVIS",
            "49013": "DUCHESNE",
            "49015": "EMERY",
            "49017": "GARFIELD",
            "49019": "GRAND",
            "49021": "IRON",
            "49023": "JUAB",
            "49025": "KANE",
            "49027": "MILLARD",
            "49029": "MORGAN",
            "49031": "PIUTE",
            "49033": "RICH",
            "49035": "SALT LAKE",
            "49037": "SAN JUAN",
            "49039": "SANPETE",
            "49041": "SEVIER",
            "49043": "SUMMIT",
            "49045": "TOOELE",
            "49047": "UINTAH",
            "49049": "UTAH",
            "49051": "WASATCH",
            "49053": "WASHINGTON",
            "49055": "WAYNE",
            "49057": "WEBER",
            "50001": "ADDISON",
            "50003": "BENNINGTON",
            "50005": "CALEDONIA",
            "50007": "CHITTENDEN",
            "50009": "ESSEX",
            "50011": "FRANKLIN",
            "50013": "GRAND ISLE",
            "50015": "LAMOILLE",
            "50017": "ORANGE",
            "50019": "ORLEANS",
            "50021": "RUTLAND",
            "50023": "WASHINGTON",
            "50025": "WINDHAM",
            "50027": "WINDSOR",
            "51001": "ACCOMACK",
            "51003": "ALBEMARLE",
            "51005": "ALLEGHANY",
            "51007": "AMELIA",
            "51009": "AMHERST",
            "51011": "APPOMATTOX",
            "51013": "ARLINGTON",
            "51015": "AUGUSTA",
            "51017": "BATH",
            "51019": "BEDFORD",
            "51021": "BLAND",
            "51023": "BOTETOURT",
            "51025": "BRUNSWICK",
            "51027": "BUCHANAN",
            "51029": "BUCKINGHAM",
            "51031": "CAMPBELL",
            "51033": "CAROLINE",
            "51035": "CARROLL",
            "51036": "CHARLES CITY",
            "51037": "CHARLOTTE",
            "51041": "CHESTERFIELD",
            "51043": "CLARKE",
            "51045": "CRAIG",
            "51047": "CULPEPER",
            "51049": "CUMBERLAND",
            "51051": "DICKENSON",
            "51053": "DINWIDDIE",
            "51057": "ESSEX",
            "51059": "FAIRFAX",
            "51061": "FAUQUIER",
            "51063": "FLOYD",
            "51065": "FLUVANNA",
            "51067": "FRANKLIN",
            "51069": "FREDERICK",
            "51071": "GILES",
            "51073": "GLOUCESTER",
            "51075": "GOOCHLAND",
            "51077": "GRAYSON",
            "51079": "GREENE",
            "51081": "GREENSVILLE",
            "51083": "HALIFAX",
            "51085": "HANOVER",
            "51087": "HENRICO",
            "51089": "HENRY",
            "51091": "HIGHLAND",
            "51093": "ISLE OF WIGHT",
            "51095": "JAMES CITY",
            "51097": "KING AND QUEEN",
            "51099": "KING GEORGE",
            "51101": "KING WILLIAM",
            "51103": "LANCASTER",
            "51105": "LEE",
            "51107": "LOUDOUN",
            "51109": "LOUISA",
            "51111": "LUNENBURG",
            "51113": "MADISON",
            "51115": "MATHEWS",
            "51117": "MECKLENBURG",
            "51119": "MIDDLESEX",
            "51121": "MONTGOMERY",
            "51125": "NELSON",
            "51127": "NEW KENT",
            "51131": "NORTHAMPTON",
            "51133": "NORTHUMBERLAND",
            "51135": "NOTTOWAY",
            "51137": "ORANGE",
            "51139": "PAGE",
            "51141": "PATRICK",
            "51143": "PITTSYLVANIA",
            "51145": "POWHATAN",
            "51147": "PRINCE EDWARD",
            "51149": "PRINCE GEORGE",
            "51153": "PRINCE WILLIAM",
            "51155": "PULASKI",
            "51157": "RAPPAHANNOCK",
            "51159": "RICHMOND",
            "51161": "ROANOKE",
            "51163": "ROCKBRIDGE",
            "51165": "ROCKINGHAM",
            "51167": "RUSSELL",
            "51169": "SCOTT",
            "51171": "SHENANDOAH",
            "51173": "SMYTH",
            "51175": "SOUTHAMPTON",
            "51177": "SPOTSYLVANIA",
            "51179": "STAFFORD",
            "51181": "SURRY",
            "51183": "SUSSEX",
            "51185": "TAZEWELL",
            "51187": "WARREN",
            "51191": "WASHINGTON",
            "51193": "WESTMORELAND",
            "51195": "WISE",
            "51197": "WYTHE",
            "51199": "YORK",
            "51510": "ALEXANDRIA",
            "51515": "BEDFORD CITY",
            "51520": "BRISTOL",
            "51530": "BUENA VISTA",
            "51540": "CHARLOTTESVILLE",
            "51550": "CHESAPEAKE",
            "51570": "COLONIAL HEIGHTS",
            "51580": "COVINGTON",
            "51590": "DANVILLE",
            "51595": "EMPORIA",
            "51600": "FAIRFAX",
            "51610": "FALLS CHURCH",
            "51620": "FRANKLIN",
            "51630": "FREDERICKSBURG",
            "51640": "GALAX",
            "51650": "HAMPTON",
            "51660": "HARRISONBURG",
            "51670": "HOPEWELL",
            "51678": "LEXINGTON",
            "51680": "LYNCHBURG",
            "51683": "MANASSAS",
            "51685": "MANASSAS PARK",
            "51690": "MARTINSVILLE",
            "51700": "NEWPORT NEWS",
            "51710": "NORFOLK",
            "51720": "NORTON",
            "51730": "PETERSBURG",
            "51735": "POQUOSON",
            "51740": "PORTSMOUTH",
            "51750": "RADFORD",
            "51760": "RICHMOND",
            "51770": "ROANOKE CITY",
            "51775": "SALEM",
            "51790": "STAUNTON",
            "51800": "SUFFOLK",
            "51810": "VIRGINIA BEACH",
            "51820": "WAYNESBORO",
            "51830": "WILLIAMSBURG",
            "51840": "WINCHESTER",
            "53001": "ADAMS",
            "53003": "ASOTIN",
            "53005": "BENTON",
            "53007": "CHELAN",
            "53009": "CLALLAM",
            "53011": "CLARK",
            "53013": "COLUMBIA",
            "53015": "COWLITZ",
            "53017": "DOUGLAS",
            "53019": "FERRY",
            "53021": "FRANKLIN",
            "53023": "GARFIELD",
            "53025": "GRANT",
            "53027": "GRAYS HARBOR",
            "53029": "ISLAND",
            "53031": "JEFFERSON",
            "53033": "KING",
            "53035": "KITSAP",
            "53037": "KITTITAS",
            "53039": "KLICKITAT",
            "53041": "LEWIS",
            "53043": "LINCOLN",
            "53045": "MASON",
            "53047": "OKANOGAN",
            "53049": "PACIFIC",
            "53051": "PEND OREILLE",
            "53053": "PIERCE",
            "53055": "SAN JUAN",
            "53057": "SKAGIT",
            "53059": "SKAMANIA",
            "53061": "SNOHOMISH",
            "53063": "SPOKANE",
            "53065": "STEVENS",
            "53067": "THURSTON",
            "53069": "WAHKIAKUM",
            "53071": "WALLA WALLA",
            "53073": "WHATCOM",
            "53075": "WHITMAN",
            "53077": "YAKIMA",
            "54001": "BARBOUR",
            "54003": "BERKELEY",
            "54005": "BOONE",
            "54007": "BRAXTON",
            "54009": "BROOKE",
            "54011": "CABELL",
            "54013": "CALHOUN",
            "54015": "CLAY",
            "54017": "DODDRIDGE",
            "54019": "FAYETTE",
            "54021": "GILMER",
            "54023": "GRANT",
            "54025": "GREENBRIER",
            "54027": "HAMPSHIRE",
            "54029": "HANCOCK",
            "54031": "HARDY",
            "54033": "HARRISON",
            "54035": "JACKSON",
            "54037": "JEFFERSON",
            "54039": "KANAWHA",
            "54041": "LEWIS",
            "54043": "LINCOLN",
            "54045": "LOGAN",
            "54047": "MCDOWELL",
            "54049": "MARION",
            "54051": "MARSHALL",
            "54053": "MASON",
            "54055": "MERCER",
            "54057": "MINERAL",
            "54059": "MINGO",
            "54061": "MONONGALIA",
            "54063": "MONROE",
            "54065": "MORGAN",
            "54067": "NICHOLAS",
            "54069": "OHIO",
            "54071": "PENDLETON",
            "54073": "PLEASANTS",
            "54075": "POCAHONTAS",
            "54077": "PRESTON",
            "54079": "PUTNAM",
            "54081": "RALEIGH",
            "54083": "RANDOLPH",
            "54085": "RITCHIE",
            "54087": "ROANE",
            "54089": "SUMMERS",
            "54091": "TAYLOR",
            "54093": "TUCKER",
            "54095": "TYLER",
            "54097": "UPSHUR",
            "54099": "WAYNE",
            "54101": "WEBSTER",
            "54103": "WETZEL",
            "54105": "WIRT",
            "54107": "WOOD",
            "54109": "WYOMING",
            "55001": "ADAMS",
            "55003": "ASHLAND",
            "55005": "BARRON",
            "55007": "BAYFIELD",
            "55009": "BROWN",
            "55011": "BUFFALO",
            "55013": "BURNETT",
            "55015": "CALUMET",
            "55017": "CHIPPEWA",
            "55019": "CLARK",
            "55021": "COLUMBIA",
            "55023": "CRAWFORD",
            "55025": "DANE",
            "55027": "DODGE",
            "55029": "DOOR",
            "55031": "DOUGLAS",
            "55033": "DUNN",
            "55035": "EAU CLAIRE",
            "55037": "FLORENCE",
            "55039": "FOND DU LAC",
            "55041": "FOREST",
            "55043": "GRANT",
            "55045": "GREEN",
            "55047": "GREEN LAKE",
            "55049": "IOWA",
            "55051": "IRON",
            "55053": "JACKSON",
            "55055": "JEFFERSON",
            "55057": "JUNEAU",
            "55059": "KENOSHA",
            "55061": "KEWAUNEE",
            "55063": "LA CROSSE",
            "55065": "LAFAYETTE",
            "55067": "LANGLADE",
            "55069": "LINCOLN",
            "55071": "MANITOWOC",
            "55073": "MARATHON",
            "55075": "MARINETTE",
            "55077": "MARQUETTE",
            "55078": "MENOMINEE",
            "55079": "MILWAUKEE",
            "55081": "MONROE",
            "55083": "OCONTO",
            "55085": "ONEIDA",
            "55087": "OUTAGAMIE",
            "55089": "OZAUKEE",
            "55091": "PEPIN",
            "55093": "PIERCE",
            "55095": "POLK",
            "55097": "PORTAGE",
            "55099": "PRICE",
            "55101": "RACINE",
            "55103": "RICHLAND",
            "55105": "ROCK",
            "55107": "RUSK",
            "55109": "ST. CROIX",
            "55111": "SAUK",
            "55113": "SAWYER",
            "55115": "SHAWANO",
            "55117": "SHEBOYGAN",
            "55119": "TAYLOR",
            "55121": "TREMPEALEAU",
            "55123": "VERNON",
            "55125": "VILAS",
            "55127": "WALWORTH",
            "55129": "WASHBURN",
            "55131": "WASHINGTON",
            "55133": "WAUKESHA",
            "55135": "WAUPACA",
            "55137": "WAUSHARA",
            "55139": "WINNEBAGO",
            "55141": "WOOD",
            "56001": "ALBANY",
            "56003": "BIG HORN",
            "56005": "CAMPBELL",
            "56007": "CARBON",
            "56009": "CONVERSE",
            "56011": "CROOK",
            "56013": "FREMONT",
            "56015": "GOSHEN",
            "56017": "HOT SPRINGS",
            "56019": "JOHNSON",
            "56021": "LARAMIE",
            "56023": "LINCOLN",
            "56025": "NATRONA",
            "56027": "NIOBRARA",
            "56029": "PARK",
            "56031": "PLATTE",
            "56033": "SHERIDAN",
            "56035": "SUBLETTE",
            "56037": "SWEETWATER",
            "56039": "TETON",
            "56041": "UINTA",
            "56043": "WASHAKIE",
            "56045": "WESTON",
            "60010": "EASTERN",
            "60020": "MANU'A",
            "60030": "ROSE ISLAND",
            "60040": "SWAINS ISLAND",
            "60050": "WESTERN",
            "66010": "GUAM",
            "69085": "NORTHERN ISLANDS",
            "69100": "ROTA",
            "69110": "SAIPAN",
            "69120": "TINIAN",
            "72001": "ADJUNTAS",
            "72003": "AGUADA",
            "72005": "AGUADILLA",
            "72007": "AGUAS BUENAS",
            "72009": "AIBONITO",
            "72011": "ANASCO",
            "72013": "ARECIBO",
            "72015": "ARROYO",
            "72017": "BARCELONETA",
            "72019": "BARRANQUITAS",
            "72021": "BAYAMON",
            "72023": "CABO ROJO",
            "72025": "CAGUAS",
            "72027": "CAMUY",
            "72029": "CANOVANAS",
            "72031": "CAROLINA",
            "72033": "CATANO",
            "72035": "CAYEY",
            "72037": "CEIBA",
            "72039": "CIALES",
            "72041": "CIDRA",
            "72043": "COAMO",
            "72045": "COMERIO",
            "72047": "COROZAL",
            "72049": "CULEBRA",
            "72051": "DORADO",
            "72053": "FAJARDO",
            "72054": "FLORIDA",
            "72055": "GUANICA",
            "72057": "GUAYAMA",
            "72059": "GUAYANILLA",
            "72061": "GUAYNABO",
            "72063": "GURABO",
            "72065": "HATILLO",
            "72067": "HORMIGUEROS",
            "72069": "HUMACAO",
            "72071": "ISABELA",
            "72073": "JAYUYA",
            "72075": "JUANA DIAZ",
            "72077": "JUNCOS",
            "72079": "LAJAS",
            "72081": "LARES",
            "72083": "LAS MARIAS",
            "72085": "LAS PIEDRAS",
            "72087": "LOIZA",
            "72089": "LUQUILLO",
            "72091": "MANATI",
            "72093": "MARICAO",
            "72095": "MAUNABO",
            "72097": "MAYAGUEZ",
            "72099": "MOCA",
            "72101": "MOROVIS",
            "72103": "NAGUABO",
            "72105": "NARANJITO",
            "72107": "OROCOVIS",
            "72109": "PATILLAS",
            "72111": "PENUELAS",
            "72113": "PONCE",
            "72115": "QUEBRADILLAS",
            "72117": "RINCON",
            "72119": "RIO GRANDE",
            "72121": "SABANA GRANDE",
            "72123": "SALINAS",
            "72125": "SAN GERMAN",
            "72127": "SAN JUAN",
            "72129": "SAN LORENZO",
            "72131": "SAN SEBASTIAN",
            "72133": "SANTA ISABEL",
            "72135": "TOA ALTA",
            "72137": "TOA BAJA",
            "72139": "TRUJILLO ALTO",
            "72141": "UTUADO",
            "72143": "VEGA ALTA",
            "72145": "VEGA BAJA",
            "72147": "VIEQUES",
            "72149": "VILLALBA",
            "72151": "YABUCOA",
            "72153": "YAUCO",
            "74300": "MIDWAY ISLANDS",
            "78010": "ST. CROIX",
            "78020": "ST. JOHN",
            "78030": "ST. THOMAS"
        },
        topology: {
            type: "Topology",
            objects: {
                counties: {
                    "type": "GeometryCollection",
                    "geometries": [{
                        "type": "Polygon",
                        "id": 53073,
                        "arcs": [[0, 1, 2, 3]]
                    }, {
                        "type": "Polygon",
                        "id": 30105,
                        "arcs": [[4, 5, 6, 7, 8, 9]]
                    }, {
                        "type": "Polygon",
                        "id": 30029,
                        "arcs": [[10, 11, 12, 13, 14, 15, 16, 17, 18, 19]]
                    }, {
                        "type": "Polygon",
                        "id": 16021,
                        "arcs": [[20, 21, 22, 23]]
                    }, {
                        "type": "Polygon",
                        "id": 30071,
                        "arcs": [[-9, 24, 25, 26, 27, 28, 29]]
                    }, {
                        "type": "Polygon",
                        "id": 38079,
                        "arcs": [[30, 31, 32, 33]]
                    }, {
                        "type": "Polygon",
                        "id": 30053,
                        "arcs": [[-19, 34, 35, -21, 36]]
                    }, {
                        "type": "Polygon",
                        "id": 38009,
                        "arcs": [[-32, 37, 38, 39, 40]]
                    }, {
                        "type": "Polygon",
                        "id": 30035,
                        "arcs": [[41, 42, -11, 43]]
                    }, {
                        "type": "Polygon",
                        "id": 30041,
                        "arcs": [[44, 45, 46, 47]]
                    }, {
                        "type": "Polygon",
                        "id": 30005,
                        "arcs": [[-29, -28, 48, 49, -48, 50]]
                    }, {
                        "type": "Polygon",
                        "id": 30019,
                        "arcs": [[51, 52, -5, 53]]
                    }, {
                        "type": "Polygon",
                        "id": 38067,
                        "arcs": [[54, 55, 56, 57]]
                    }, {
                        "type": "Polygon",
                        "id": 27069,
                        "arcs": [[58, 59, -55, 60]]
                    }, {
                        "type": "Polygon",
                        "id": 38095,
                        "arcs": [[61, 62, 63, -34, 64, 65]]
                    }, {
                        "type": "Polygon",
                        "id": 38019,
                        "arcs": [[-57, 66, 67, -66, 68]]
                    }, {
                        "type": "Polygon",
                        "id": 53047,
                        "arcs": [[69, 70, 71, 72, 73, 74, -1, 75]]
                    }, {
                        "type": "Polygon",
                        "id": 53065,
                        "arcs": [[76, 77, 78, 79, 80]]
                    }, {
                        "type": "Polygon",
                        "id": 53051,
                        "arcs": [[-23, 81, 82, -77, 83]]
                    }, {
                        "type": "Polygon",
                        "id": 53019,
                        "arcs": [[-80, 84, -70, 85]]
                    }, {
                        "type": "Polygon",
                        "id": 30051,
                        "arcs": [[86, 87, 88, -46, 89]]
                    }, {
                        "type": "Polygon",
                        "id": 38023,
                        "arcs": [[90, 91, 92, 93]]
                    }, {
                        "type": "Polygon",
                        "id": 38013,
                        "arcs": [[94, 95, 96, 97, -91, 98]]
                    }, {
                        "type": "Polygon",
                        "id": 30101,
                        "arcs": [[99, -88, 100, -42]]
                    }, {
                        "type": "Polygon",
                        "id": 38075,
                        "arcs": [[101, 102, -95, 103, -40]]
                    }, {
                        "type": "Polygon",
                        "id": 27135,
                        "arcs": [[104, 105, -59, 106, 107]]
                    }, {
                        "type": "Polygon",
                        "id": 30091,
                        "arcs": [[-93, 108, 109, -52, 110]]
                    }, {
                        "type": "Polygon",
                        "id": 16017,
                        "arcs": [[-36, 111, 112, 113, 114, -82, -22]]
                    }, {
                        "type": "Polygon",
                        "id": 38101,
                        "arcs": [[-103, 115, 116, 117, -96]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 53055,
                        "arcs": [[[118]], [[119]], [[120]]]
                    }, {
                        "type": "Polygon",
                        "id": 27071,
                        "arcs": [[121, 122, 123, 124, 125]]
                    }, {
                        "type": "Polygon",
                        "id": 53057,
                        "arcs": [[126, -2, -75, 127, 128, 129]]
                    }, {
                        "type": "Polygon",
                        "id": 38105,
                        "arcs": [[-98, 130, 131, 132, -109, -92]]
                    }, {
                        "type": "Polygon",
                        "id": 38049,
                        "arcs": [[133, 134, 135, -116, -102, -39]]
                    }, {
                        "type": "Polygon",
                        "id": 27137,
                        "arcs": [[136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, -122, 151]]
                    }, {
                        "type": "Polygon",
                        "id": 30085,
                        "arcs": [[-110, -133, 152, 153, -6, -53]]
                    }, {
                        "type": "Polygon",
                        "id": 53007,
                        "arcs": [[-74, 154, 155, 156, 157, -128]]
                    }, {
                        "type": "Polygon",
                        "id": 38061,
                        "arcs": [[158, 159, 160, -131, -97, -118]]
                    }, {
                        "type": "Polygon",
                        "id": 27089,
                        "arcs": [[161, 162, 163, 164, 165, -60, -106]]
                    }, {
                        "type": "Polygon",
                        "id": 38069,
                        "arcs": [[-64, 166, 167, 168, -134, -38, -31]]
                    }, {
                        "type": "Polygon",
                        "id": 38071,
                        "arcs": [[169, 170, 171, -62, -68]]
                    }, {
                        "type": "Polygon",
                        "id": 38099,
                        "arcs": [[-56, -166, 172, 173, -170, -67]]
                    }, {
                        "type": "Polygon",
                        "id": 27007,
                        "arcs": [[-124, 174, 175, 176, 177, 178, -162, -105, 179]]
                    }, {
                        "type": "Polygon",
                        "id": 30073,
                        "arcs": [[-101, -87, 180, 181, -12, -43]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 53029,
                        "arcs": [[[182, 183]], [[184]]]
                    }, {
                        "type": "Polygon",
                        "id": 53009,
                        "arcs": [[185, 186, 187]]
                    }, {
                        "type": "Polygon",
                        "id": 38005,
                        "arcs": [[-63, -172, 188, 189, 190, -167]]
                    }, {
                        "type": "Polygon",
                        "id": 30015,
                        "arcs": [[-50, 191, 192, 193, 194, -181, -90, -45]]
                    }, {
                        "type": "Polygon",
                        "id": 53061,
                        "arcs": [[-158, 195, 196, -183, 197, -129]]
                    }, {
                        "type": "Polygon",
                        "id": 30089,
                        "arcs": [[-18, 198, 199, 200, 201, -112, -35]]
                    }, {
                        "type": "Polygon",
                        "id": 27075,
                        "arcs": [[202, 203, -137, 204]]
                    }, {
                        "type": "Polygon",
                        "id": 38063,
                        "arcs": [[205, 206, 207, 208, -189, -171, -174]]
                    }, {
                        "type": "Polygon",
                        "id": 38035,
                        "arcs": [[-165, 209, 210, 211, -206, -173]]
                    }, {
                        "type": "Polygon",
                        "id": 27119,
                        "arcs": [[212, 213, 214, 215, 216, 217, 218, -210, -164]]
                    }, {
                        "type": "Polygon",
                        "id": 27113,
                        "arcs": [[-179, 219, -215, 220, -213, -163]]
                    }, {
                        "type": "Polygon",
                        "id": 30083,
                        "arcs": [[221, 222, 223, 224, -153]]
                    }, {
                        "type": "Polygon",
                        "id": 53017,
                        "arcs": [[225, 226, -155, -73]]
                    }, {
                        "type": "Polygon",
                        "id": 38053,
                        "arcs": [[-161, 227, 228, 229, 230, -222, -132]]
                    }, {
                        "type": "Polygon",
                        "id": 53031,
                        "arcs": [[231, 232, 233, -186, 234]]
                    }, {
                        "type": "Polygon",
                        "id": 30099,
                        "arcs": [[-195, 235, 236, -13, -182]]
                    }, {
                        "type": "Polygon",
                        "id": 30055,
                        "arcs": [[-225, 237, 238, 239, -7, -154]]
                    }, {
                        "type": "Polygon",
                        "id": 16079,
                        "arcs": [[-202, 240, 241, 242, 243, 244, -113]]
                    }, {
                        "type": "Polygon",
                        "id": 30047,
                        "arcs": [[245, -199, -17]]
                    }, {
                        "type": "Polygon",
                        "id": 53063,
                        "arcs": [[-83, -115, 246, 247, 248, 249, -78]]
                    }, {
                        "type": "Polygon",
                        "id": 27029,
                        "arcs": [[250, 251, 252, -216, -220, -178]]
                    }, {
                        "type": "Polygon",
                        "id": 16055,
                        "arcs": [[-245, 253, -247, -114]]
                    }, {
                        "type": "Polygon",
                        "id": 30033,
                        "arcs": [[-240, 254, 255, 256, 257, -25, -8]]
                    }, {
                        "type": "Polygon",
                        "id": 27125,
                        "arcs": [[-214, -221]]
                    }, {
                        "type": "Polygon",
                        "id": 53025,
                        "arcs": [[-72, 258, 259, 260, 261, 262, 263, -226]]
                    }, {
                        "type": "Polygon",
                        "id": 53043,
                        "arcs": [[-85, -79, -250, 264, 265, -259, -71]]
                    }, {
                        "type": "Polygon",
                        "id": 30049,
                        "arcs": [[266, 267, 268, 269, 270, -14, -237]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 53035,
                        "arcs": [[[271]], [[272, 273, 274, 275, 276]]]
                    }, {
                        "type": "Polygon",
                        "id": 27061,
                        "arcs": [[-151, 277, 278, -175, -123]]
                    }, {
                        "type": "Polygon",
                        "id": 38055,
                        "arcs": [[279, 280, 281, 282, 283, -159, -117, -136]]
                    }, {
                        "type": "Polygon",
                        "id": 38027,
                        "arcs": [[-209, 284, 285, 286, -190]]
                    }, {
                        "type": "Polygon",
                        "id": 38103,
                        "arcs": [[-191, -287, 287, 288, 289, 290, -168]]
                    }, {
                        "type": "Polygon",
                        "id": 38083,
                        "arcs": [[-169, -291, 291, 292, -280, -135]]
                    }, {
                        "type": "Polygon",
                        "id": 38025,
                        "arcs": [[-284, 293, 294, 295, -228, -160]]
                    }, {
                        "type": "Polygon",
                        "id": 30027,
                        "arcs": [[-27, 296, 297, 298, 299, 300, -192, -49]]
                    }, {
                        "type": "Polygon",
                        "id": 30021,
                        "arcs": [[-224, 301, 302, -238]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 53033,
                        "arcs": [[[303]], [[-157, 304, 305, 306, 307, -196]]]
                    }, {
                        "type": "Polygon",
                        "id": 30013,
                        "arcs": [[308, 309, -267, -236, -194]]
                    }, {
                        "type": "Polygon",
                        "id": 38091,
                        "arcs": [[-212, 310, 311, 312, 313, -207]]
                    }, {
                        "type": "Polygon",
                        "id": 38039,
                        "arcs": [[-314, 314, 315, 316, -285, -208]]
                    }, {
                        "type": "Polygon",
                        "id": 38097,
                        "arcs": [[317, 318, -311, -211, -219]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 53045,
                        "arcs": [[[319, -276, 320, 321, 322, 323, -232]]]
                    }, {
                        "type": "Polygon",
                        "id": 30063,
                        "arcs": [[-16, 324, 325, 326, 327, 328, 329, -200, -246]]
                    }, {
                        "type": "Polygon",
                        "id": 30077,
                        "arcs": [[-271, 330, 331, 332, -325, -15]]
                    }, {
                        "type": "Polygon",
                        "id": 30069,
                        "arcs": [[-258, 333, 334, -297, -26]]
                    }, {
                        "type": "Polygon",
                        "id": 53037,
                        "arcs": [[-227, -264, 335, -305, -156]]
                    }, {
                        "type": "Polygon",
                        "id": 38031,
                        "arcs": [[-317, 336, -288, -286]]
                    }, {
                        "type": "Polygon",
                        "id": 38057,
                        "arcs": [[337, 338, 339, -294, -283]]
                    }, {
                        "type": "Polygon",
                        "id": 53027,
                        "arcs": [[-324, 340, 341, 342, 343, -233]]
                    }, {
                        "type": "Polygon",
                        "id": 27087,
                        "arcs": [[344, 345, -217, -253]]
                    }, {
                        "type": "Polygon",
                        "id": 27107,
                        "arcs": [[-218, -346, 346, 347, 348, -318]]
                    }, {
                        "type": "Polygon",
                        "id": 30061,
                        "arcs": [[-330, 349, -241, -201]]
                    }, {
                        "type": "Polygon",
                        "id": 27021,
                        "arcs": [[350, 351, 352, 353, 354, 355, -176, -279]]
                    }, {
                        "type": "Polygon",
                        "id": 23003,
                        "arcs": [[356, 357, 358, 359, 360]]
                    }, {
                        "type": "Polygon",
                        "id": 30045,
                        "arcs": [[-301, 361, 362, -309, -193]]
                    }, {
                        "type": "Polygon",
                        "id": 16009,
                        "arcs": [[-244, 363, 364, -248, -254]]
                    }, {
                        "type": "Polygon",
                        "id": 27057,
                        "arcs": [[-356, 365, 366, -251, -177]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 53053,
                        "arcs": [[[-307, -306, 367, 368, 369, 370]], [[-273, 371]], [[-321, -275, 372]]]
                    }, {
                        "type": "Polygon",
                        "id": 30109,
                        "arcs": [[-231, 373, 374, 375, -302, -223]]
                    }, {
                        "type": "Polygon",
                        "id": 38007,
                        "arcs": [[-296, 376, 377, 378, -229]]
                    }, {
                        "type": "Polygon",
                        "id": 38033,
                        "arcs": [[-379, 379, 380, -374, -230]]
                    }, {
                        "type": "Polygon",
                        "id": 38043,
                        "arcs": [[381, 382, 383, 384, -292, -290]]
                    }, {
                        "type": "Polygon",
                        "id": 38093,
                        "arcs": [[-316, 385, 386, 387, -382, -289, -337]]
                    }, {
                        "type": "Polygon",
                        "id": 38015,
                        "arcs": [[-385, 388, 389, 390, -281, -293]]
                    }, {
                        "type": "Polygon",
                        "id": 38065,
                        "arcs": [[-391, 391, -338, -282]]
                    }, {
                        "type": "Polygon",
                        "id": 53001,
                        "arcs": [[392, 393, -260, -266]]
                    }, {
                        "type": "Polygon",
                        "id": 53075,
                        "arcs": [[-249, -365, 394, 395, 396, 397, 398, 399, -393, -265]]
                    }, {
                        "type": "Polygon",
                        "id": 38003,
                        "arcs": [[-313, 400, 401, 402, -386, -315]]
                    }, {
                        "type": "Polygon",
                        "id": 38017,
                        "arcs": [[-319, -349, 403, 404, 405, -401, -312]]
                    }, {
                        "type": "Polygon",
                        "id": 53067,
                        "arcs": [[-370, 406, -341, -323, 407]]
                    }, {
                        "type": "Polygon",
                        "id": 30079,
                        "arcs": [[-376, 408, 409, -255, -239, -303]]
                    }, {
                        "type": "Polygon",
                        "id": 27005,
                        "arcs": [[-367, 410, 411, 412, -347, -345, -252]]
                    }, {
                        "type": "Polygon",
                        "id": 27027,
                        "arcs": [[-413, 413, 414, 415, -404, -348]]
                    }, {
                        "type": "Polygon",
                        "id": 16057,
                        "arcs": [[-243, 416, 417, -395, -364]]
                    }, {
                        "type": "Polygon",
                        "id": 53077,
                        "arcs": [[-263, 418, 419, 420, 421, -368, -336]]
                    }, {
                        "type": "Polygon",
                        "id": 30059,
                        "arcs": [[-363, 422, 423, 424, 425, 426, -268, -310]]
                    }, {
                        "type": "Polygon",
                        "id": 27001,
                        "arcs": [[-150, 427, 428, 429, 430, 431, -351, -278]]
                    }, {
                        "type": "Polygon",
                        "id": 26131,
                        "arcs": [[432, 433, 434, 435]]
                    }, {
                        "type": "Polygon",
                        "id": 38089,
                        "arcs": [[-340, 436, 437, 438, 439, -377, -295]]
                    }, {
                        "type": "Polygon",
                        "id": 38059,
                        "arcs": [[-390, 440, 441, 442, -437, -339, -392]]
                    }, {
                        "type": "Polygon",
                        "id": 26013,
                        "arcs": [[443, 444, 445, 446]]
                    }, {
                        "type": "Polygon",
                        "id": 16035,
                        "arcs": [[-350, -329, 447, 448, 449, -417, -242]]
                    }, {
                        "type": "Polygon",
                        "id": 30017,
                        "arcs": [[450, 451, 452, 453, -256, -410]]
                    }, {
                        "type": "Polygon",
                        "id": 30087,
                        "arcs": [[-454, 454, 455, 456, 457, 458, -334, -257]]
                    }, {
                        "type": "Polygon",
                        "id": 30039,
                        "arcs": [[459, 460, -326, -333]]
                    }, {
                        "type": "Polygon",
                        "id": 27159,
                        "arcs": [[-355, 461, 462, -411, -366]]
                    }, {
                        "type": "Polygon",
                        "id": 27035,
                        "arcs": [[-432, 463, 464, -352]]
                    }, {
                        "type": "Polygon",
                        "id": 53049,
                        "arcs": [[465, 466, 467, -343]]
                    }, {
                        "type": "Polygon",
                        "id": 53041,
                        "arcs": [[-407, -369, -422, 468, 469, 470, -466, -342]]
                    }, {
                        "type": "Polygon",
                        "id": 30007,
                        "arcs": [[-427, 471, 472, -269]]
                    }, {
                        "type": "Polygon",
                        "id": 27017,
                        "arcs": [[473, 474, -428, -149]]
                    }, {
                        "type": "Polygon",
                        "id": 26053,
                        "arcs": [[475, 476, 477, 478, 479, 480, 481, 482, 483, 484, -434]]
                    }, {
                        "type": "Polygon",
                        "id": 30065,
                        "arcs": [[-459, 485, 486, -298, -335]]
                    }, {
                        "type": "Polygon",
                        "id": 26095,
                        "arcs": [[487, 488, 489, 490, 491]]
                    }, {
                        "type": "Polygon",
                        "id": 30037,
                        "arcs": [[-487, 492, 493, 494, 495, -299]]
                    }, {
                        "type": "Polygon",
                        "id": 30107,
                        "arcs": [[-300, -496, 496, -423, -362]]
                    }, {
                        "type": "Polygon",
                        "id": 53021,
                        "arcs": [[497, 498, 499, -261, -394, -400]]
                    }, {
                        "type": "Polygon",
                        "id": 53005,
                        "arcs": [[500, 501, 502, 503, -419, -262, -500]]
                    }, {
                        "type": "Polygon",
                        "id": 27111,
                        "arcs": [[-463, 504, 505, 506, 507, -414, -412]]
                    }, {
                        "type": "Polygon",
                        "id": 38037,
                        "arcs": [[508, 509, 510, -438, -443]]
                    }, {
                        "type": "Polygon",
                        "id": 53023,
                        "arcs": [[511, 512, 513, -398]]
                    }, {
                        "type": "Polygon",
                        "id": 30025,
                        "arcs": [[-381, 514, 515, 516, 517, -451, -409, -375]]
                    }, {
                        "type": "Polygon",
                        "id": 16049,
                        "arcs": [[518, 519, 520, 521, 522, 523, 524, -448, -328]]
                    }, {
                        "type": "Polygon",
                        "id": 30081,
                        "arcs": [[-461, 525, 526, 527, -519, -327]]
                    }, {
                        "type": "Polygon",
                        "id": 38029,
                        "arcs": [[-384, 528, 529, 530, 531, -441, -389]]
                    }, {
                        "type": "Polygon",
                        "id": 38047,
                        "arcs": [[-388, 532, 533, -529, -383]]
                    }, {
                        "type": "Polygon",
                        "id": 16069,
                        "arcs": [[-450, 534, -524, 535, 536, -396, -418]]
                    }, {
                        "type": "Polygon",
                        "id": 38087,
                        "arcs": [[537, 538, 539, -515, -380, -378, -440]]
                    }, {
                        "type": "Polygon",
                        "id": 38045,
                        "arcs": [[540, 541, 542, -533, -387, -403]]
                    }, {
                        "type": "Polygon",
                        "id": 38041,
                        "arcs": [[-511, 543, -538, -439]]
                    }, {
                        "type": "Polygon",
                        "id": 27167,
                        "arcs": [[-508, 544, 545, 546, -415]]
                    }, {
                        "type": "Polygon",
                        "id": 38073,
                        "arcs": [[-406, 547, 548, 549, -541, -402]]
                    }, {
                        "type": "Polygon",
                        "id": 38077,
                        "arcs": [[-547, 550, 551, 552, -548, -405, -416]]
                    }, {
                        "type": "Polygon",
                        "id": 53013,
                        "arcs": [[553, 554, 555, -498, -399, -514]]
                    }, {
                        "type": "Polygon",
                        "id": 53071,
                        "arcs": [[-556, 556, -501, -499]]
                    }, {
                        "type": "Polygon",
                        "id": 55051,
                        "arcs": [[557, -484, -483, -482, -481, -480, -479, 558, 559, 560, 561]]
                    }, {
                        "type": "Polygon",
                        "id": 23025,
                        "arcs": [[562, 563, 564, 565, 566, 567, -360]]
                    }, {
                        "type": "Polygon",
                        "id": 23021,
                        "arcs": [[568, -563, -359]]
                    }, {
                        "type": "Polygon",
                        "id": 30043,
                        "arcs": [[-473, 569, 570, 571, 572, -331, -270]]
                    }, {
                        "type": "Polygon",
                        "id": 26153,
                        "arcs": [[-490, 573, 574, 575, 576]]
                    }, {
                        "type": "Polygon",
                        "id": 30111,
                        "arcs": [[577, 578, 579, 580, -493, -486, -458]]
                    }, {
                        "type": "Polygon",
                        "id": 30103,
                        "arcs": [[581, -578, -457]]
                    }, {
                        "type": "Polygon",
                        "id": 16061,
                        "arcs": [[-449, -525, -535]]
                    }, {
                        "type": "Polygon",
                        "id": 53003,
                        "arcs": [[-537, 582, -512, -397]]
                    }, {
                        "type": "Polygon",
                        "id": 38085,
                        "arcs": [[-532, 583, 584, -509, -442]]
                    }, {
                        "type": "Polygon",
                        "id": 26071,
                        "arcs": [[-445, 585, 586, 587, 588, 589, 590, -476, -433, 591]]
                    }, {
                        "type": "Polygon",
                        "id": 27115,
                        "arcs": [[592, 593, 594, 595, 596, -429, -475]]
                    }, {
                        "type": "Polygon",
                        "id": 23019,
                        "arcs": [[597, 598, 599, 600, -564, -569, -358]]
                    }, {
                        "type": "Polygon",
                        "id": 53059,
                        "arcs": [[-421, 601, 602, 603, 604, 605, -469]]
                    }, {
                        "type": "Polygon",
                        "id": 53015,
                        "arcs": [[-606, 606, 607, 608, 609, -470]]
                    }, {
                        "type": "Polygon",
                        "id": 53069,
                        "arcs": [[-471, -610, 610, -467]]
                    }, {
                        "type": "Polygon",
                        "id": 27153,
                        "arcs": [[-354, 611, 612, 613, -505, -462]]
                    }, {
                        "type": "Polygon",
                        "id": 27097,
                        "arcs": [[-465, 614, 615, 616, -612, -353]]
                    }, {
                        "type": "Polygon",
                        "id": 55125,
                        "arcs": [[617, 618, -559, -478, -477, -591, 619]]
                    }, {
                        "type": "Polygon",
                        "id": 41007,
                        "arcs": [[620, 621, 622]]
                    }, {
                        "type": "Polygon",
                        "id": 38001,
                        "arcs": [[-510, -585, 623, 624, 625, 626, -539, -544]]
                    }, {
                        "type": "Polygon",
                        "id": 38081,
                        "arcs": [[-553, 627, 628, 629, -549]]
                    }, {
                        "type": "Polygon",
                        "id": 38051,
                        "arcs": [[-543, 630, 631, 632, -530, -534]]
                    }, {
                        "type": "Polygon",
                        "id": 38021,
                        "arcs": [[-550, -630, 633, 634, -631, -542]]
                    }, {
                        "type": "Polygon",
                        "id": 38011,
                        "arcs": [[-627, 635, -516, -540]]
                    }, {
                        "type": "Polygon",
                        "id": 30023,
                        "arcs": [[-573, 636, 637, -526, -460, -332]]
                    }, {
                        "type": "Polygon",
                        "id": 26043,
                        "arcs": [[638, 639, 640, -587, 641]]
                    }, {
                        "type": "Polygon",
                        "id": 27095,
                        "arcs": [[642, 643, 644, 645, -615, -464, -431]]
                    }, {
                        "type": "Polygon",
                        "id": 30097,
                        "arcs": [[-495, 646, 647, -424, -497]]
                    }, {
                        "type": "Polygon",
                        "id": 30031,
                        "arcs": [[-426, 648, 649, 650, 651, 652, -570, -472]]
                    }, {
                        "type": "Polygon",
                        "id": 30067,
                        "arcs": [[-648, 653, 654, 655, -649, -425]]
                    }, {
                        "type": "Polygon",
                        "id": 30093,
                        "arcs": [[656, 657, -637, -572]]
                    }, {
                        "type": "Polygon",
                        "id": 41009,
                        "arcs": [[658, 659, 660, -621, 661, -608]]
                    }, {
                        "type": "Polygon",
                        "id": 27065,
                        "arcs": [[-597, 662, -643, -430]]
                    }, {
                        "type": "Polygon",
                        "id": 55013,
                        "arcs": [[663, 664, 665, 666, -595, -594, 667]]
                    }, {
                        "type": "Polygon",
                        "id": 55113,
                        "arcs": [[668, 669, 670, 671, 672]]
                    }, {
                        "type": "Polygon",
                        "id": 55129,
                        "arcs": [[-672, 673, -664, 674]]
                    }, {
                        "type": "Polygon",
                        "id": 30011,
                        "arcs": [[675, 676, 677, 678, -452, -518]]
                    }, {
                        "type": "Polygon",
                        "id": 30095,
                        "arcs": [[-581, 679, -654, -647, -494]]
                    }, {
                        "type": "Polygon",
                        "id": 27051,
                        "arcs": [[-507, 680, 681, 682, -545]]
                    }, {
                        "type": "Polygon",
                        "id": 27041,
                        "arcs": [[-614, 683, 684, -681, -506]]
                    }, {
                        "type": "Polygon",
                        "id": 55041,
                        "arcs": [[685, 686, 687, 688, 689, -620, -590]]
                    }, {
                        "type": "Polygon",
                        "id": 53011,
                        "arcs": [[-605, 690, -659, -607]]
                    }, {
                        "type": "Polygon",
                        "id": 53039,
                        "arcs": [[-504, 691, 692, 693, 694, 695, -602, -420]]
                    }, {
                        "type": "Polygon",
                        "id": 30003,
                        "arcs": [[-456, 696, 697, 698, 699, -579, -582]]
                    }, {
                        "type": "Polygon",
                        "id": 27155,
                        "arcs": [[-683, 700, 701, 702, -551, -546]]
                    }, {
                        "type": "Polygon",
                        "id": 55037,
                        "arcs": [[-588, -641, 703, -686, -589]]
                    }, {
                        "type": "Polygon",
                        "id": 41059,
                        "arcs": [[-555, 704, 705, 706, 707, -502, -557]]
                    }, {
                        "type": "Polygon",
                        "id": 41063,
                        "arcs": [[-513, -583, -536, -523, 708, 709, 710, -705, -554]]
                    }, {
                        "type": "Polygon",
                        "id": 26109,
                        "arcs": [[711, 712, 713, 714, -639, 715]]
                    }, {
                        "type": "Polygon",
                        "id": 55099,
                        "arcs": [[-619, 716, 717, 718, 719, -670, 720, -560]]
                    }, {
                        "type": "Polygon",
                        "id": 46105,
                        "arcs": [[721, 722, 723, 724, 725, -625]]
                    }, {
                        "type": "Polygon",
                        "id": 46031,
                        "arcs": [[726, 727, 728, 729, -722, -624, -584]]
                    }, {
                        "type": "Polygon",
                        "id": 46063,
                        "arcs": [[-626, -726, 730, -676, -517, -636]]
                    }, {
                        "type": "Polygon",
                        "id": 46021,
                        "arcs": [[-633, 731, 732, -727, -531]]
                    }, {
                        "type": "Polygon",
                        "id": 30001,
                        "arcs": [[-658, 733, 734, 735, 736, -527, -638]]
                    }, {
                        "type": "Polygon",
                        "id": 46089,
                        "arcs": [[-635, 737, 738, 739, -732, -632]]
                    }, {
                        "type": "Polygon",
                        "id": 46013,
                        "arcs": [[-629, 740, 741, 742, 743, 744, -738, -634]]
                    }, {
                        "type": "Polygon",
                        "id": 46109,
                        "arcs": [[-703, 745, 746, 747, 748, -552]]
                    }, {
                        "type": "Polygon",
                        "id": 46091,
                        "arcs": [[-749, 749, -741, -628]]
                    }, {
                        "type": "Polygon",
                        "id": 41049,
                        "arcs": [[-708, 750, 751, 752, -692, -503]]
                    }, {
                        "type": "Polygon",
                        "id": 55085,
                        "arcs": [[-690, 753, 754, -717, -618]]
                    }, {
                        "type": "Polygon",
                        "id": 41061,
                        "arcs": [[755, 756, -706, -711]]
                    }, {
                        "type": "Polygon",
                        "id": 30057,
                        "arcs": [[-653, 757, -734, -657, -571]]
                    }, {
                        "type": "Polygon",
                        "id": 27009,
                        "arcs": [[-646, 758, 759, -616]]
                    }, {
                        "type": "Polygon",
                        "id": 41021,
                        "arcs": [[760, 761, 762, -693, -753]]
                    }, {
                        "type": "Polygon",
                        "id": 30075,
                        "arcs": [[-679, 763, 764, 765, -697, -455, -453]]
                    }, {
                        "type": "Polygon",
                        "id": 26031,
                        "arcs": [[766, 767, 768, 769, 770, 771]]
                    }, {
                        "type": "Polygon",
                        "id": 41057,
                        "arcs": [[772, 773, 774, 775, 776, -622]]
                    }, {
                        "type": "Polygon",
                        "id": 41067,
                        "arcs": [[777, 778, 779, -773, -661]]
                    }, {
                        "type": "Polygon",
                        "id": 27145,
                        "arcs": [[-760, 780, 781, 782, 783, 784, -684, -613, -617]]
                    }, {
                        "type": "Polygon",
                        "id": 27149,
                        "arcs": [[785, 786, 787, -701, -682]]
                    }, {
                        "type": "Polygon",
                        "id": 27121,
                        "arcs": [[-785, 788, 789, -786, -685]]
                    }, {
                        "type": "Polygon",
                        "id": 41055,
                        "arcs": [[790, -694, -763]]
                    }, {
                        "type": "Polygon",
                        "id": 27059,
                        "arcs": [[791, 792, 793, -644, -663]]
                    }, {
                        "type": "Polygon",
                        "id": 27025,
                        "arcs": [[-667, 794, 795, 796, -792, -596]]
                    }, {
                        "type": "Polygon",
                        "id": 55095,
                        "arcs": [[797, 798, 799, -795, -666]]
                    }, {
                        "type": "Polygon",
                        "id": 41051,
                        "arcs": [[-691, -604, 800, 801, -778, -660]]
                    }, {
                        "type": "Polygon",
                        "id": 41027,
                        "arcs": [[802, 803, -801, -603, -696]]
                    }, {
                        "type": "Polygon",
                        "id": 41065,
                        "arcs": [[-791, -762, 804, 805, 806, 807, -803, -695]]
                    }, {
                        "type": "Polygon",
                        "id": 16059,
                        "arcs": [[-737, 808, 809, 810, 811, -520, -528]]
                    }, {
                        "type": "Polygon",
                        "id": 23029,
                        "arcs": [[812, -598, -357, 813]]
                    }, {
                        "type": "Polygon",
                        "id": 23007,
                        "arcs": [[814, 815, 816, 817, -567]]
                    }, {
                        "type": "Polygon",
                        "id": 26141,
                        "arcs": [[818, 819, -767, 820]]
                    }, {
                        "type": "Polygon",
                        "id": 55005,
                        "arcs": [[-674, 821, 822, 823, -798, -665]]
                    }, {
                        "type": "Polygon",
                        "id": 55107,
                        "arcs": [[-720, 824, 825, -822, -671]]
                    }, {
                        "type": "Polygon",
                        "id": 30009,
                        "arcs": [[-700, 826, 827, -655, -680, -580]]
                    }, {
                        "type": "Polygon",
                        "id": 46129,
                        "arcs": [[-740, 828, 829, 830, -728, -733]]
                    }, {
                        "type": "Polygon",
                        "id": 46045,
                        "arcs": [[-745, 831, 832, -829, -739]]
                    }, {
                        "type": "Polygon",
                        "id": 46037,
                        "arcs": [[-750, -748, 833, 834, 835, 836, -742]]
                    }, {
                        "type": "Polygon",
                        "id": 27011,
                        "arcs": [[-702, -788, 837, 838, 839, 840, -746]]
                    }, {
                        "type": "Polygon",
                        "id": 27141,
                        "arcs": [[-645, -794, 841, 842, 843, -781, -759]]
                    }, {
                        "type": "Polygon",
                        "id": 55069,
                        "arcs": [[844, 845, 846, -718, -755]]
                    }, {
                        "type": "Polygon",
                        "id": 46041,
                        "arcs": [[-831, 847, 848, 849, 850, -729]]
                    }, {
                        "type": "Polygon",
                        "id": 46137,
                        "arcs": [[-851, 851, 852, -723, -730]]
                    }, {
                        "type": "Polygon",
                        "id": 55067,
                        "arcs": [[-689, 853, 854, 855, 856, -845, -754]]
                    }, {
                        "type": "Polygon",
                        "id": 41005,
                        "arcs": [[-804, -808, 857, 858, -779, -802]]
                    }, {
                        "type": "Polygon",
                        "id": 41071,
                        "arcs": [[-859, 859, 860, 861, -774, -780]]
                    }, {
                        "type": "Polygon",
                        "id": 27171,
                        "arcs": [[-844, 862, 863, 864, 865, -782]]
                    }, {
                        "type": "Polygon",
                        "id": 27003,
                        "arcs": [[-797, 866, 867, 868, -842, -793]]
                    }, {
                        "type": "Polygon",
                        "id": 27067,
                        "arcs": [[869, 870, 871, 872, -789, -784]]
                    }, {
                        "type": "Polygon",
                        "id": 27151,
                        "arcs": [[-873, 873, 874, -838, -787, -790]]
                    }, {
                        "type": "Polygon",
                        "id": 55119,
                        "arcs": [[-847, 875, 876, 877, -825, -719]]
                    }, {
                        "type": "Polygon",
                        "id": 55083,
                        "arcs": [[878, 879, 880, 881, 882, 883, 884, -854, -688]]
                    }, {
                        "type": "Polygon",
                        "id": 23017,
                        "arcs": [[-817, 885, 886, 887, 888, -889, 889, 890, 891]]
                    }, {
                        "type": "Polygon",
                        "id": 46051,
                        "arcs": [[-841, 892, 893, 894, -834, -747]]
                    }, {
                        "type": "Polygon",
                        "id": 27093,
                        "arcs": [[-866, 895, 896, -870, -783]]
                    }, {
                        "type": "Polygon",
                        "id": 33007,
                        "arcs": [[897, 898, 899, 900, -891]]
                    }, {
                        "type": "Polygon",
                        "id": 27163,
                        "arcs": [[-800, 901, 902, 903, 904, -867, -796]]
                    }, {
                        "type": "Polygon",
                        "id": 55017,
                        "arcs": [[-878, 905, 906, 907, -823, -826]]
                    }, {
                        "type": "Polygon",
                        "id": 41047,
                        "arcs": [[-860, -858, -807, 908, 909, 910, -861]]
                    }, {
                        "type": "Polygon",
                        "id": 16003,
                        "arcs": [[911, 912, 913, 914, -709, -522]]
                    }, {
                        "type": "Polygon",
                        "id": 27073,
                        "arcs": [[-839, -875, 915, 916, 917, -893, -840]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 23009,
                        "arcs": [[[918]], [[919]], [[920, -599, -813]]]
                    }, {
                        "type": "Polygon",
                        "id": 46107,
                        "arcs": [[-833, 921, 922, 923, -848, -830]]
                    }, {
                        "type": "Polygon",
                        "id": 46049,
                        "arcs": [[-744, 924, 925, 926, -922, -832]]
                    }, {
                        "type": "Polygon",
                        "id": 27053,
                        "arcs": [[-843, -869, 927, 928, 929, 930, -863]]
                    }, {
                        "type": "Polygon",
                        "id": 46115,
                        "arcs": [[-837, 931, 932, 933, -925, -743]]
                    }, {
                        "type": "Polygon",
                        "id": 16085,
                        "arcs": [[-812, 934, 935, 936, -912, -521]]
                    }, {
                        "type": "Polygon",
                        "id": 46019,
                        "arcs": [[-725, 937, 938, 939, -677, -731]]
                    }, {
                        "type": "Polygon",
                        "id": 55109,
                        "arcs": [[940, 941, -902, -799]]
                    }, {
                        "type": "Polygon",
                        "id": 55033,
                        "arcs": [[-908, 942, 943, 944, -941, -824]]
                    }, {
                        "type": "Polygon",
                        "id": 26009,
                        "arcs": [[945, 946, 947, 948, 949]]
                    }, {
                        "type": "Polygon",
                        "id": 26137,
                        "arcs": [[950, 951, -946, 952, -769]]
                    }, {
                        "type": "Polygon",
                        "id": 26119,
                        "arcs": [[953, 954, -951, -768, -820]]
                    }, {
                        "type": "Polygon",
                        "id": 46025,
                        "arcs": [[955, 956, 957, 958, -932, -836]]
                    }, {
                        "type": "Polygon",
                        "id": 46029,
                        "arcs": [[-895, 959, 960, -956, -835]]
                    }, {
                        "type": "Polygon",
                        "id": 27023,
                        "arcs": [[-872, 961, 962, -916, -874]]
                    }, {
                        "type": "Polygon",
                        "id": 27123,
                        "arcs": [[-905, 963, -928, -868]]
                    }, {
                        "type": "Polygon",
                        "id": 55073,
                        "arcs": [[-846, -857, 964, 965, 966, 967, -876]]
                    }, {
                        "type": "Polygon",
                        "id": 55078,
                        "arcs": [[-885, 968, -855]]
                    }, {
                        "type": "Polygon",
                        "id": 41001,
                        "arcs": [[-915, 969, 970, 971, -756, -710]]
                    }, {
                        "type": "Polygon",
                        "id": 41053,
                        "arcs": [[-911, 972, 973, 974, -775, -862]]
                    }, {
                        "type": "Polygon",
                        "id": 41069,
                        "arcs": [[-752, 975, 976, 977, -805, -761]]
                    }, {
                        "type": "Polygon",
                        "id": 41041,
                        "arcs": [[-975, 978, 979, 980, -776]]
                    }, {
                        "type": "Polygon",
                        "id": 46093,
                        "arcs": [[-853, 981, 982, 983, -938, -724]]
                    }, {
                        "type": "Polygon",
                        "id": 55019,
                        "arcs": [[-968, 984, 985, 986, -906, -877]]
                    }, {
                        "type": "Polygon",
                        "id": 55115,
                        "arcs": [[-969, -884, 987, 988, 989, -965, -856]]
                    }, {
                        "type": "Polygon",
                        "id": 50011,
                        "arcs": [[990, 991, 992, 993, 994]]
                    }, {
                        "type": "Polygon",
                        "id": 50009,
                        "arcs": [[995, 996, 997, 998, -900]]
                    }, {
                        "type": "Polygon",
                        "id": 50013,
                        "arcs": [[999, 1000, 1001, -994]]
                    }, {
                        "type": "Polygon",
                        "id": 36019,
                        "arcs": [[1002, 1003, 1004, 1005, -1001]]
                    }, {
                        "type": "Polygon",
                        "id": 50019,
                        "arcs": [[-998, 1006, 1007, -991, 1008]]
                    }, {
                        "type": "Polygon",
                        "id": 56029,
                        "arcs": [[1009, 1010, 1011, 1012, 1013, -650, -656, -828]]
                    }, {
                        "type": "Polygon",
                        "id": 36089,
                        "arcs": [[1014, 1015, 1016, 1017, 1018, 1019]]
                    }, {
                        "type": "Polygon",
                        "id": 56003,
                        "arcs": [[1020, 1021, 1022, -1010, -827, -699]]
                    }, {
                        "type": "Polygon",
                        "id": 56005,
                        "arcs": [[1023, 1024, 1025, 1026, 1027, -765]]
                    }, {
                        "type": "Polygon",
                        "id": 56033,
                        "arcs": [[-766, -1028, 1028, -1021, -698]]
                    }, {
                        "type": "Polygon",
                        "id": 36033,
                        "arcs": [[-1005, 1029, 1030, -1015, 1031]]
                    }, {
                        "type": "Polygon",
                        "id": 56011,
                        "arcs": [[-678, -940, 1032, 1033, -1024, -764]]
                    }, {
                        "type": "Polygon",
                        "id": 41023,
                        "arcs": [[-757, -972, 1034, 1035, 1036, -976, -751, -707]]
                    }, {
                        "type": "Polygon",
                        "id": 27085,
                        "arcs": [[-865, 1037, 1038, 1039, -896]]
                    }, {
                        "type": "Polygon",
                        "id": 27019,
                        "arcs": [[-931, 1040, 1041, -1038, -864]]
                    }, {
                        "type": "Polygon",
                        "id": 46039,
                        "arcs": [[-918, 1042, 1043, 1044, 1045, -960, -894]]
                    }, {
                        "type": "Polygon",
                        "id": 27173,
                        "arcs": [[1046, 1047, 1048, 1049, -1043, -917, -963]]
                    }, {
                        "type": "Polygon",
                        "id": 27037,
                        "arcs": [[-904, 1050, 1051, 1052, 1053, -929, -964]]
                    }, {
                        "type": "Polygon",
                        "id": 46119,
                        "arcs": [[1054, 1055, 1056, -849, -924]]
                    }, {
                        "type": "Polygon",
                        "id": 46069,
                        "arcs": [[-927, 1057, 1058, 1059, 1060, -1055, -923]]
                    }, {
                        "type": "Polygon",
                        "id": 46059,
                        "arcs": [[-934, 1061, 1062, 1063, -1058, -926]]
                    }, {
                        "type": "Polygon",
                        "id": 27129,
                        "arcs": [[-897, -1040, 1064, 1065, 1066, 1067, -1047, -962, -871]]
                    }, {
                        "type": "Polygon",
                        "id": 16037,
                        "arcs": [[1068, 1069, 1070, 1071, 1072, -935, -811]]
                    }, {
                        "type": "Polygon",
                        "id": 55093,
                        "arcs": [[-945, 1073, 1074, -1051, -903, -942]]
                    }, {
                        "type": "Polygon",
                        "id": 26001,
                        "arcs": [[1075, 1076, 1077, 1078]]
                    }, {
                        "type": "Polygon",
                        "id": 26079,
                        "arcs": [[1079, 1080, 1081, -947]]
                    }, {
                        "type": "Polygon",
                        "id": 26039,
                        "arcs": [[1082, 1083, -1080, -952]]
                    }, {
                        "type": "Polygon",
                        "id": 55035,
                        "arcs": [[-987, 1084, 1085, 1086, 1087, -943, -907]]
                    }, {
                        "type": "Polygon",
                        "id": 26135,
                        "arcs": [[-1078, 1088, -1083, -955]]
                    }, {
                        "type": "Polygon",
                        "id": 16087,
                        "arcs": [[1089, 1090, 1091, -970, -914]]
                    }, {
                        "type": "Polygon",
                        "id": 41031,
                        "arcs": [[-978, 1092, 1093, 1094, -909, -806]]
                    }, {
                        "type": "Polygon",
                        "id": 27139,
                        "arcs": [[-1054, 1095, 1096, 1097, -1041, -930]]
                    }, {
                        "type": "Polygon",
                        "id": 46057,
                        "arcs": [[-1046, 1098, 1099, -957, -961]]
                    }, {
                        "type": "Polygon",
                        "id": 50015,
                        "arcs": [[1100, 1101, 1102, -992, -1008]]
                    }, {
                        "type": "Polygon",
                        "id": 41043,
                        "arcs": [[-1095, 1103, 1104, 1105, -973, -910]]
                    }, {
                        "type": "Polygon",
                        "id": 46117,
                        "arcs": [[-1057, 1106, 1107, 1108, 1109, -850]]
                    }, {
                        "type": "Polygon",
                        "id": 26019,
                        "arcs": [[1110, 1111, 1112, 1113]]
                    }, {
                        "type": "Polygon",
                        "id": 50005,
                        "arcs": [[1114, 1115, 1116, -1101, -1007, -997]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 23027,
                        "arcs": [[[-601, 1117, 1118, 1119, 1120, -565]]]
                    }, {
                        "type": "Polygon",
                        "id": 16043,
                        "arcs": [[1121, 1122, 1123, 1124, 1125, -735, -758, -652]]
                    }, {
                        "type": "Polygon",
                        "id": 46055,
                        "arcs": [[1126, 1127, 1128, -982, -852, -1110]]
                    }, {
                        "type": "Polygon",
                        "id": 50007,
                        "arcs": [[-1103, 1129, 1130, 1131, -1003, -1000, -993]]
                    }, {
                        "type": "Polygon",
                        "id": 41003,
                        "arcs": [[-1106, 1132, -979, -974]]
                    }, {
                        "type": "Polygon",
                        "id": 23011,
                        "arcs": [[1133, 1134, 1135, 1136, -815, -566, -1121]]
                    }, {
                        "type": "Polygon",
                        "id": 27143,
                        "arcs": [[-1042, -1098, 1137, 1138, -1065, -1039]]
                    }, {
                        "type": "Polygon",
                        "id": 27049,
                        "arcs": [[1139, 1140, 1141, 1142, 1143, -1052, -1075]]
                    }, {
                        "type": "Polygon",
                        "id": 27127,
                        "arcs": [[1144, 1145, 1146, 1147, -1048, -1068]]
                    }, {
                        "type": "Polygon",
                        "id": 55097,
                        "arcs": [[1148, 1149, 1150, 1151, -966]]
                    }, {
                        "type": "Polygon",
                        "id": 55141,
                        "arcs": [[-1152, 1152, 1153, 1154, -985, -967]]
                    }, {
                        "type": "Polygon",
                        "id": 55009,
                        "arcs": [[-883, 1155, 1156, 1157, 1158, 1159, -988]]
                    }, {
                        "type": "Polygon",
                        "id": 55091,
                        "arcs": [[-1088, 1160, 1161, -1140, -1074, -944]]
                    }, {
                        "type": "Polygon",
                        "id": 55135,
                        "arcs": [[1162, 1163, 1164, -1149, -990]]
                    }, {
                        "type": "Polygon",
                        "id": 55061,
                        "arcs": [[1165, 1166, -1157, 1167, 1168]]
                    }, {
                        "type": "Polygon",
                        "id": 56039,
                        "arcs": [[1169, 1170, 1171, 1172, 1173, -1122, -651, -1014]]
                    }, {
                        "type": "Polygon",
                        "id": 46005,
                        "arcs": [[-959, 1174, 1175, 1176, -1062, -933]]
                    }, {
                        "type": "Polygon",
                        "id": 27081,
                        "arcs": [[1177, 1178, 1179, -1044, -1050]]
                    }, {
                        "type": "Polygon",
                        "id": 27083,
                        "arcs": [[-1148, 1180, 1181, -1178, -1049]]
                    }, {
                        "type": "Polygon",
                        "id": 46081,
                        "arcs": [[-984, 1182, 1183, -1033, -939]]
                    }, {
                        "type": "Polygon",
                        "id": 55011,
                        "arcs": [[-1087, 1184, 1185, 1186, -1161]]
                    }, {
                        "type": "Polygon",
                        "id": 55121,
                        "arcs": [[1187, 1188, 1189, 1190, -1185, -1086]]
                    }, {
                        "type": "Polygon",
                        "id": 55053,
                        "arcs": [[-986, -1155, 1191, 1192, 1193, -1188, -1085]]
                    }, {
                        "type": "Polygon",
                        "id": 55087,
                        "arcs": [[-989, -1160, 1194, 1195, -1163]]
                    }, {
                        "type": "Polygon",
                        "id": 16033,
                        "arcs": [[-1126, 1196, 1197, -809, -736]]
                    }, {
                        "type": "Polygon",
                        "id": 56019,
                        "arcs": [[-1027, 1198, 1199, 1200, -1022, -1029]]
                    }, {
                        "type": "Polygon",
                        "id": 41013,
                        "arcs": [[-977, -1037, 1201, 1202, -1093]]
                    }, {
                        "type": "Polygon",
                        "id": 46065,
                        "arcs": [[-1061, 1203, -1107, -1056]]
                    }, {
                        "type": "Polygon",
                        "id": 36031,
                        "arcs": [[1204, 1205, 1206, 1207, -1030, -1004, -1132]]
                    }, {
                        "type": "Polygon",
                        "id": 27079,
                        "arcs": [[1208, 1209, 1210, 1211, -1138, -1097]]
                    }, {
                        "type": "Polygon",
                        "id": 27131,
                        "arcs": [[-1053, -1144, 1212, 1213, 1214, -1209, -1096]]
                    }, {
                        "type": "Polygon",
                        "id": 46077,
                        "arcs": [[-1100, 1215, 1216, 1217, 1218, -1175, -958]]
                    }, {
                        "type": "Polygon",
                        "id": 46011,
                        "arcs": [[-1180, 1219, 1220, 1221, -1216, -1099, -1045]]
                    }, {
                        "type": "Polygon",
                        "id": 26101,
                        "arcs": [[1222, 1223, 1224, 1225, -1112]]
                    }, {
                        "type": "Polygon",
                        "id": 26165,
                        "arcs": [[1226, 1227, 1228, -1223, 1229]]
                    }, {
                        "type": "Polygon",
                        "id": 26143,
                        "arcs": [[1230, 1231, 1232, 1233, -1084]]
                    }, {
                        "type": "Polygon",
                        "id": 26113,
                        "arcs": [[-1234, 1234, 1235, -1227, -1081]]
                    }, {
                        "type": "Polygon",
                        "id": 26069,
                        "arcs": [[1236, 1237, 1238, -1077]]
                    }, {
                        "type": "Polygon",
                        "id": 26129,
                        "arcs": [[-1239, 1239, 1240, -1231, -1089]]
                    }, {
                        "type": "Polygon",
                        "id": 16045,
                        "arcs": [[-937, 1241, 1242, 1243, 1244, -1090, -913]]
                    }, {
                        "type": "Polygon",
                        "id": 46103,
                        "arcs": [[-1129, 1245, 1246, 1247, 1248, -1183, -983]]
                    }, {
                        "type": "Polygon",
                        "id": 50023,
                        "arcs": [[1249, 1250, -1130, -1102, -1117]]
                    }, {
                        "type": "Polygon",
                        "id": 27015,
                        "arcs": [[1251, 1252, 1253, 1254, -1145, -1067]]
                    }, {
                        "type": "Polygon",
                        "id": 23001,
                        "arcs": [[1255, 1256, -886, -816, -1137]]
                    }, {
                        "type": "Polygon",
                        "id": 27103,
                        "arcs": [[1257, -1252, -1066, -1139, -1212]]
                    }, {
                        "type": "Polygon",
                        "id": 27157,
                        "arcs": [[-1162, -1187, 1258, 1259, -1141]]
                    }, {
                        "type": "Polygon",
                        "id": 41045,
                        "arcs": [[-1092, 1260, 1261, 1262, 1263, 1264, -1035, -971]]
                    }, {
                        "type": "Polygon",
                        "id": 33009,
                        "arcs": [[1265, 1266, 1267, 1268, 1269, 1270, -1115, -996, -899]]
                    }, {
                        "type": "Polygon",
                        "id": 41017,
                        "arcs": [[-1203, 1271, 1272, 1273, 1274, -1104, -1094]]
                    }, {
                        "type": "Polygon",
                        "id": 36045,
                        "arcs": [[1275, 1276, -1019, 1277, 1278, 1279, 1280, 1281]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 23013,
                        "arcs": [[[1282, 1283, -1119]]]
                    }, {
                        "type": "Polygon",
                        "id": 16015,
                        "arcs": [[-1073, 1284, 1285, -1242, -936]]
                    }, {
                        "type": "Polygon",
                        "id": 23015,
                        "arcs": [[-1120, -1284, 1286, 1287, 1288, -1134]]
                    }, {
                        "type": "Polygon",
                        "id": 55071,
                        "arcs": [[-1167, 1289, 1290, 1291, -1158]]
                    }, {
                        "type": "Polygon",
                        "id": 50001,
                        "arcs": [[-1251, 1292, 1293, 1294, 1295, -1205, -1131]]
                    }, {
                        "type": "Polygon",
                        "id": 41039,
                        "arcs": [[-1275, 1296, 1297, 1298, -980, -1133, -1105]]
                    }, {
                        "type": "Polygon",
                        "id": 33003,
                        "arcs": [[-890, 888, 1299, 1300, 1301, -1266, -898]]
                    }, {
                        "type": "Polygon",
                        "id": 27013,
                        "arcs": [[-1211, 1302, 1303, 1304, 1305, -1253, -1258]]
                    }, {
                        "type": "Polygon",
                        "id": 55057,
                        "arcs": [[1306, 1307, 1308, 1309, -1192, -1154]]
                    }, {
                        "type": "Polygon",
                        "id": 55001,
                        "arcs": [[-1151, 1310, 1311, 1312, -1307, -1153]]
                    }, {
                        "type": "Polygon",
                        "id": 55137,
                        "arcs": [[-1165, 1313, 1314, 1315, -1311, -1150]]
                    }, {
                        "type": "Polygon",
                        "id": 55139,
                        "arcs": [[1316, 1317, 1318, -1314, -1164, -1196]]
                    }, {
                        "type": "Polygon",
                        "id": 55015,
                        "arcs": [[-1159, -1292, 1319, 1320, -1317, -1195]]
                    }, {
                        "type": "Polygon",
                        "id": 16023,
                        "arcs": [[-1198, 1321, 1322, 1323, -1070, -1069, -810]]
                    }, {
                        "type": "Polygon",
                        "id": 50017,
                        "arcs": [[-1271, 1324, -1293, -1250, -1116]]
                    }, {
                        "type": "Polygon",
                        "id": 36049,
                        "arcs": [[1325, 1326, -1278, -1018, 1327]]
                    }, {
                        "type": "Polygon",
                        "id": 46085,
                        "arcs": [[1328, 1329, 1330, 1331, 1332, -1108, -1204, -1060, 1333]]
                    }, {
                        "type": "Polygon",
                        "id": 27117,
                        "arcs": [[-1182, 1334, 1335, 1336, -1220, -1179]]
                    }, {
                        "type": "Polygon",
                        "id": 27101,
                        "arcs": [[-1147, 1337, 1338, 1339, -1335, -1181]]
                    }, {
                        "type": "Polygon",
                        "id": 46073,
                        "arcs": [[-1177, 1340, 1341, 1342, 1343, -1063]]
                    }, {
                        "type": "Polygon",
                        "id": 27147,
                        "arcs": [[1344, 1345, 1346, 1347, -1214]]
                    }, {
                        "type": "Polygon",
                        "id": 27039,
                        "arcs": [[1348, 1349, -1345, -1213, -1143]]
                    }, {
                        "type": "Polygon",
                        "id": 46101,
                        "arcs": [[-1337, 1350, 1351, -1221]]
                    }, {
                        "type": "Polygon",
                        "id": 27161,
                        "arcs": [[-1348, 1352, 1353, -1303, -1210, -1215]]
                    }, {
                        "type": "Polygon",
                        "id": 46017,
                        "arcs": [[-1344, 1354, -1334, -1059, -1064]]
                    }, {
                        "type": "Polygon",
                        "id": 46111,
                        "arcs": [[-1219, 1355, 1356, 1357, 1358, -1341, -1176]]
                    }, {
                        "type": "Polygon",
                        "id": 27109,
                        "arcs": [[-1260, 1359, 1360, 1361, -1349, -1142]]
                    }, {
                        "type": "Polygon",
                        "id": 27033,
                        "arcs": [[-1255, 1362, 1363, 1364, -1338, -1146]]
                    }, {
                        "type": "Polygon",
                        "id": 46079,
                        "arcs": [[-1222, -1352, 1365, 1366, 1367, -1217]]
                    }, {
                        "type": "Polygon",
                        "id": 46097,
                        "arcs": [[-1368, 1368, 1369, -1356, -1218]]
                    }, {
                        "type": "Polygon",
                        "id": 27169,
                        "arcs": [[-1186, -1191, 1370, 1371, 1372, -1360, -1259]]
                    }, {
                        "type": "Polygon",
                        "id": 56045,
                        "arcs": [[-1184, -1249, 1373, 1374, 1375, -1025, -1034]]
                    }, {
                        "type": "Polygon",
                        "id": 26105,
                        "arcs": [[1376, 1377, 1378, -1225]]
                    }, {
                        "type": "Polygon",
                        "id": 23005,
                        "arcs": [[-1257, 1379, 1380, 1381, 1382, 1383, -887]]
                    }, {
                        "type": "Polygon",
                        "id": 46075,
                        "arcs": [[-1333, 1384, 1385, -1386, 1386, -1127, -1109]]
                    }, {
                        "type": "Polygon",
                        "id": 56043,
                        "arcs": [[-1201, 1387, 1388, 1389, -1011, -1023]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 23023,
                        "arcs": [[[-1382, 1390]], [[-1288, 1391]], [[1392, -1380, -1256, -1136]]]
                    }, {
                        "type": "Polygon",
                        "id": 26085,
                        "arcs": [[-1224, -1229, 1393, 1394, -1377]]
                    }, {
                        "type": "Polygon",
                        "id": 26133,
                        "arcs": [[-1236, 1395, 1396, -1394, -1228]]
                    }, {
                        "type": "Polygon",
                        "id": 26035,
                        "arcs": [[-1233, 1397, 1398, -1396, -1235]]
                    }, {
                        "type": "Polygon",
                        "id": 26051,
                        "arcs": [[1399, 1400, 1401, -1398, -1232, -1241]]
                    }, {
                        "type": "Polygon",
                        "id": 55081,
                        "arcs": [[-1310, 1402, 1403, -1193]]
                    }, {
                        "type": "Polygon",
                        "id": 16075,
                        "arcs": [[-1245, 1404, -1261, -1091]]
                    }, {
                        "type": "Polygon",
                        "id": 36041,
                        "arcs": [[1405, 1406, 1407, 1408, -1016, -1031, -1208]]
                    }, {
                        "type": "Polygon",
                        "id": 27165,
                        "arcs": [[-1306, 1409, 1410, -1363, -1254]]
                    }, {
                        "type": "Polygon",
                        "id": 16039,
                        "arcs": [[-1072, 1411, 1412, 1413, 1414, 1415, 1416, -1285]]
                    }, {
                        "type": "Polygon",
                        "id": 36043,
                        "arcs": [[-1409, 1417, 1418, 1419, 1420, -1328, -1017]]
                    }, {
                        "type": "Polygon",
                        "id": 55063,
                        "arcs": [[-1194, -1404, 1421, 1422, -1371, -1190, -1189]]
                    }, {
                        "type": "Polygon",
                        "id": 56017,
                        "arcs": [[-1390, 1423, -1012]]
                    }, {
                        "type": "Polygon",
                        "id": 16051,
                        "arcs": [[-1125, 1424, 1425, 1426, -1322, -1197]]
                    }, {
                        "type": "Polygon",
                        "id": 41025,
                        "arcs": [[-1265, 1427, 1428, 1429, -1272, -1202, -1036]]
                    }, {
                        "type": "Polygon",
                        "id": 56013,
                        "arcs": [[-1424, -1389, 1430, 1431, 1432, 1433, -1170, -1013]]
                    }, {
                        "type": "Polygon",
                        "id": 26017,
                        "arcs": [[1434, 1435, 1436, 1437, -1401, 1438]]
                    }, {
                        "type": "Polygon",
                        "id": 46071,
                        "arcs": [[-1387, 1385, 1439, 1440, 1441, -1246, -1128]]
                    }, {
                        "type": "Polygon",
                        "id": 16013,
                        "arcs": [[-1324, 1442, 1443, 1444, 1445, 1446, 1447, -1412, -1071]]
                    }, {
                        "type": "Polygon",
                        "id": 16081,
                        "arcs": [[-1174, 1448, 1449, -1123]]
                    }, {
                        "type": "Polygon",
                        "id": 55047,
                        "arcs": [[-1319, 1450, 1451, 1452, 1453, -1315]]
                    }, {
                        "type": "Polygon",
                        "id": 55077,
                        "arcs": [[-1454, 1454, -1312, -1316]]
                    }, {
                        "type": "Polygon",
                        "id": 50027,
                        "arcs": [[-1270, 1455, 1456, 1457, 1458, -1294, -1325]]
                    }, {
                        "type": "Polygon",
                        "id": 41019,
                        "arcs": [[1459, 1460, 1461, 1462, 1463, 1464, -1298]]
                    }, {
                        "type": "Polygon",
                        "id": 55039,
                        "arcs": [[1465, 1466, 1467, -1451, -1318, -1321]]
                    }, {
                        "type": "Polygon",
                        "id": 46003,
                        "arcs": [[-1359, 1468, 1469, 1470, 1471, -1342]]
                    }, {
                        "type": "Polygon",
                        "id": 46015,
                        "arcs": [[-1472, 1472, -1329, -1355, -1343]]
                    }, {
                        "type": "Polygon",
                        "id": 16065,
                        "arcs": [[-1450, 1473, -1425, -1124]]
                    }, {
                        "type": "Polygon",
                        "id": 55117,
                        "arcs": [[1474, 1475, 1476, -1466, -1320, -1291]]
                    }, {
                        "type": "Polygon",
                        "id": 16027,
                        "arcs": [[-1244, 1477, 1478, -1262, -1405]]
                    }, {
                        "type": "Polygon",
                        "id": 46095,
                        "arcs": [[-1332, 1479, 1480, -1440, -1386, -1385]]
                    }, {
                        "type": "Polygon",
                        "id": 16025,
                        "arcs": [[1481, 1482, -1413, -1448]]
                    }, {
                        "type": "Polygon",
                        "id": 50021,
                        "arcs": [[1483, 1484, -1295, -1459]]
                    }, {
                        "type": "Polygon",
                        "id": 46033,
                        "arcs": [[1485, 1486, 1487, -1374, -1248]]
                    }, {
                        "type": "Polygon",
                        "id": 27133,
                        "arcs": [[-1340, 1488, 1489, 1490, -1336]]
                    }, {
                        "type": "Polygon",
                        "id": 27105,
                        "arcs": [[-1365, 1491, 1492, 1493, -1489, -1339]]
                    }, {
                        "type": "Polygon",
                        "id": 27047,
                        "arcs": [[1494, 1495, 1496, 1497, -1353, -1347]]
                    }, {
                        "type": "Polygon",
                        "id": 27099,
                        "arcs": [[-1362, 1498, 1499, 1500, 1501, -1495, -1346, -1350]]
                    }, {
                        "type": "Polygon",
                        "id": 27055,
                        "arcs": [[-1423, 1502, 1503, 1504, 1505, -1372]]
                    }, {
                        "type": "Polygon",
                        "id": 46035,
                        "arcs": [[1506, 1507, 1508, -1469, -1358]]
                    }, {
                        "type": "Polygon",
                        "id": 46061,
                        "arcs": [[-1370, 1509, 1510, -1507, -1357]]
                    }, {
                        "type": "Polygon",
                        "id": 27045,
                        "arcs": [[-1373, -1506, 1511, 1512, -1499, -1361]]
                    }, {
                        "type": "Polygon",
                        "id": 27063,
                        "arcs": [[-1411, 1513, 1514, 1515, 1516, -1492, -1364]]
                    }, {
                        "type": "Polygon",
                        "id": 27043,
                        "arcs": [[-1354, -1498, 1517, 1518, 1519, -1304]]
                    }, {
                        "type": "Polygon",
                        "id": 46099,
                        "arcs": [[1520, 1521, 1522, 1523, -1366, -1351, -1491]]
                    }, {
                        "type": "Polygon",
                        "id": 27091,
                        "arcs": [[-1305, -1520, 1524, 1525, -1514, -1410]]
                    }, {
                        "type": "Polygon",
                        "id": 46087,
                        "arcs": [[-1367, -1524, 1526, 1527, -1510, -1369]]
                    }, {
                        "type": "Polygon",
                        "id": 26111,
                        "arcs": [[-1438, 1528, 1529, 1530, -1402]]
                    }, {
                        "type": "Polygon",
                        "id": 26127,
                        "arcs": [[1531, 1532, 1533, -1378]]
                    }, {
                        "type": "Polygon",
                        "id": 26073,
                        "arcs": [[-1531, 1534, 1535, 1536, -1399]]
                    }, {
                        "type": "Polygon",
                        "id": 23031,
                        "arcs": [[1537, 1538, -1300, -889, -888, -1384]]
                    }, {
                        "type": "Polygon",
                        "id": 26107,
                        "arcs": [[-1537, 1539, 1540, -1397]]
                    }, {
                        "type": "Polygon",
                        "id": 26123,
                        "arcs": [[-1541, 1541, 1542, 1543, -1532, -1395]]
                    }, {
                        "type": "Polygon",
                        "id": 36115,
                        "arcs": [[-1485, 1544, 1545, 1546, 1547, -1206, -1296]]
                    }, {
                        "type": "Polygon",
                        "id": 16001,
                        "arcs": [[-1286, -1417, 1548, -1478, -1243]]
                    }, {
                        "type": "Polygon",
                        "id": 36113,
                        "arcs": [[1549, -1406, -1207, -1548]]
                    }, {
                        "type": "Polygon",
                        "id": 46123,
                        "arcs": [[1550, 1551, 1552, -1480, -1331]]
                    }, {
                        "type": "Polygon",
                        "id": 33001,
                        "arcs": [[1553, 1554, -1267, -1302]]
                    }, {
                        "type": "Polygon",
                        "id": 26157,
                        "arcs": [[1555, 1556, 1557, 1558, 1559, -1436, 1560, 1561]]
                    }, {
                        "type": "Polygon",
                        "id": 55123,
                        "arcs": [[1562, 1563, 1564, 1565, -1503, -1422, -1403, -1309]]
                    }, {
                        "type": "Polygon",
                        "id": 36075,
                        "arcs": [[-1327, 1566, 1567, 1568, 1569, 1570, -1279]]
                    }, {
                        "type": "Polygon",
                        "id": 46113,
                        "arcs": [[1571, 1572, 1573, 1574, -1486, -1247, -1442]]
                    }, {
                        "type": "Polygon",
                        "id": 26151,
                        "arcs": [[1575, 1576, -1557, 1577, 1578]]
                    }, {
                        "type": "Polygon",
                        "id": 16073,
                        "arcs": [[-1549, -1416, 1579, 1580, 1581, -1263, -1479]]
                    }, {
                        "type": "Polygon",
                        "id": 55021,
                        "arcs": [[1582, 1583, 1584, -1313, -1455, -1453]]
                    }, {
                        "type": "Polygon",
                        "id": 55111,
                        "arcs": [[-1585, 1585, 1586, 1587, -1563, -1308]]
                    }, {
                        "type": "Polygon",
                        "id": 55027,
                        "arcs": [[1588, 1589, 1590, 1591, -1583, -1452, -1468]]
                    }, {
                        "type": "Polygon",
                        "id": 16019,
                        "arcs": [[-1474, -1449, -1173, 1592, 1593, 1594, -1426]]
                    }, {
                        "type": "Polygon",
                        "id": 16011,
                        "arcs": [[1595, 1596, 1597, -1443, -1323, -1427, -1595]]
                    }, {
                        "type": "Polygon",
                        "id": 41035,
                        "arcs": [[1598, 1599, 1600, 1601, -1460, -1297, -1274]]
                    }, {
                        "type": "Polygon",
                        "id": 41037,
                        "arcs": [[1602, 1603, -1599, -1273, -1430]]
                    }, {
                        "type": "Polygon",
                        "id": 36065,
                        "arcs": [[1604, 1605, -1567, -1326, -1421]]
                    }, {
                        "type": "Polygon",
                        "id": 33013,
                        "arcs": [[-1555, 1606, 1607, 1608, 1609, -1268]]
                    }, {
                        "type": "Polygon",
                        "id": 41011,
                        "arcs": [[1610, 1611, -1464]]
                    }, {
                        "type": "Polygon",
                        "id": 33019,
                        "arcs": [[-1610, 1612, 1613, 1614, -1456, -1269]]
                    }, {
                        "type": "Polygon",
                        "id": 33017,
                        "arcs": [[-1539, 1615, 1616, -1607, -1554, -1301]]
                    }, {
                        "type": "Polygon",
                        "id": 26145,
                        "arcs": [[-1560, 1617, 1618, 1619, -1529, -1437]]
                    }, {
                        "type": "Polygon",
                        "id": 55103,
                        "arcs": [[1620, 1621, 1622, -1564, -1588]]
                    }, {
                        "type": "Polygon",
                        "id": 55089,
                        "arcs": [[1623, 1624, 1625, -1476]]
                    }, {
                        "type": "Polygon",
                        "id": 55131,
                        "arcs": [[-1477, -1626, 1626, -1589, -1467]]
                    }, {
                        "type": "Polygon",
                        "id": 19189,
                        "arcs": [[1627, 1628, 1629, -1518, -1497]]
                    }, {
                        "type": "Polygon",
                        "id": 19109,
                        "arcs": [[1630, 1631, 1632, -1525, -1519, -1630, 1633]]
                    }, {
                        "type": "Polygon",
                        "id": 19059,
                        "arcs": [[1634, 1635, -1516, 1636]]
                    }, {
                        "type": "Polygon",
                        "id": 19063,
                        "arcs": [[1637, -1637, -1515, -1526, -1633]]
                    }, {
                        "type": "Polygon",
                        "id": 19195,
                        "arcs": [[1638, -1628, -1496, -1502, 1639]]
                    }, {
                        "type": "Polygon",
                        "id": 19143,
                        "arcs": [[1640, 1641, -1493, -1517, -1636]]
                    }, {
                        "type": "Polygon",
                        "id": 56027,
                        "arcs": [[-1488, 1642, 1643, 1644, 1645, 1646, -1375]]
                    }, {
                        "type": "Polygon",
                        "id": 19131,
                        "arcs": [[1647, 1648, -1640, -1501, 1649]]
                    }, {
                        "type": "Polygon",
                        "id": 19119,
                        "arcs": [[1650, 1651, -1521, -1490, -1494, -1642]]
                    }, {
                        "type": "Polygon",
                        "id": 19089,
                        "arcs": [[1652, 1653, -1650, -1500, -1513]]
                    }, {
                        "type": "Polygon",
                        "id": 19005,
                        "arcs": [[-1566, 1654, 1655, 1656, -1504]]
                    }, {
                        "type": "Polygon",
                        "id": 19191,
                        "arcs": [[1657, 1658, -1653, -1512, -1505, -1657]]
                    }, {
                        "type": "Polygon",
                        "id": 46083,
                        "arcs": [[-1652, 1659, 1660, 1661, 1662, -1522]]
                    }, {
                        "type": "Polygon",
                        "id": 56009,
                        "arcs": [[-1647, 1663, 1664, 1665, 1666, -1199, -1026, -1376]]
                    }, {
                        "type": "Polygon",
                        "id": 46023,
                        "arcs": [[-1471, 1667, 1668, 1669, 1670, 1671, 1672, -1473]]
                    }, {
                        "type": "Polygon",
                        "id": 46125,
                        "arcs": [[-1523, -1663, 1673, 1674, 1675, -1527]]
                    }, {
                        "type": "Polygon",
                        "id": 46067,
                        "arcs": [[-1528, -1676, 1676, 1677, -1669, 1678, -1508, -1511]]
                    }, {
                        "type": "Polygon",
                        "id": 56025,
                        "arcs": [[-1200, -1667, 1679, -1431, -1388]]
                    }, {
                        "type": "Polygon",
                        "id": 46043,
                        "arcs": [[-1509, -1679, -1668, -1470]]
                    }, {
                        "type": "Polygon",
                        "id": 46053,
                        "arcs": [[-1673, 1680, 1681, -1551, -1330]]
                    }, {
                        "type": "Polygon",
                        "id": 46047,
                        "arcs": [[-1575, 1682, 1683, -1643, -1487]]
                    }, {
                        "type": "Polygon",
                        "id": 26121,
                        "arcs": [[-1544, 1684, 1685, 1686, -1533]]
                    }, {
                        "type": "Polygon",
                        "id": 26117,
                        "arcs": [[-1536, 1687, 1688, 1689, -1542, -1540]]
                    }, {
                        "type": "Polygon",
                        "id": 56035,
                        "arcs": [[1690, 1691, -1171, -1434]]
                    }, {
                        "type": "Polygon",
                        "id": 26057,
                        "arcs": [[-1530, -1620, 1692, 1693, -1688, -1535]]
                    }, {
                        "type": "Polygon",
                        "id": 55023,
                        "arcs": [[-1623, 1694, 1695, -1655, -1565]]
                    }, {
                        "type": "Polygon",
                        "id": 36011,
                        "arcs": [[1696, 1697, 1698, 1699, 1700, 1701, -1570]]
                    }, {
                        "type": "Polygon",
                        "id": 36091,
                        "arcs": [[-1547, 1702, 1703, 1704, 1705, 1706, -1407, -1550]]
                    }, {
                        "type": "Polygon",
                        "id": 46007,
                        "arcs": [[1707, 1708, -1572, -1441]]
                    }, {
                        "type": "Polygon",
                        "id": 46121,
                        "arcs": [[-1553, 1709, -1708, -1481]]
                    }, {
                        "type": "Polygon",
                        "id": 36073,
                        "arcs": [[1710, 1711, 1712, 1713]]
                    }, {
                        "type": "Polygon",
                        "id": 36063,
                        "arcs": [[-1713, 1714, 1715, 1716]]
                    }, {
                        "type": "Polygon",
                        "id": 36055,
                        "arcs": [[1717, 1718, 1719, 1720, -1711, 1721]]
                    }, {
                        "type": "Polygon",
                        "id": 36117,
                        "arcs": [[1722, 1723, -1718, 1724, -1701]]
                    }, {
                        "type": "Polygon",
                        "id": 26087,
                        "arcs": [[1725, 1726, 1727, 1728, -1558, -1577]]
                    }, {
                        "type": "Polygon",
                        "id": 56023,
                        "arcs": [[-1692, 1729, 1730, 1731, 1732, 1733, -1593, -1172]]
                    }, {
                        "type": "Polygon",
                        "id": 50003,
                        "arcs": [[-1458, 1734, 1735, 1736, 1737, -1545, -1484]]
                    }, {
                        "type": "Polygon",
                        "id": 55025,
                        "arcs": [[-1592, 1738, 1739, 1740, 1741, -1586, -1584]]
                    }, {
                        "type": "Polygon",
                        "id": 26081,
                        "arcs": [[1742, 1743, 1744, 1745, -1685, -1543, -1690]]
                    }, {
                        "type": "Polygon",
                        "id": 36035,
                        "arcs": [[-1707, 1746, -1418, -1408]]
                    }, {
                        "type": "Polygon",
                        "id": 33015,
                        "arcs": [[1747, 1748, 1749, -1608, -1617]]
                    }, {
                        "type": "Polygon",
                        "id": 36067,
                        "arcs": [[1750, 1751, -1697, -1569]]
                    }, {
                        "type": "Polygon",
                        "id": 50025,
                        "arcs": [[-1615, 1752, 1753, -1735, -1457]]
                    }, {
                        "type": "Polygon",
                        "id": 19167,
                        "arcs": [[1754, 1755, 1756, -1660, -1651]]
                    }, {
                        "type": "Polygon",
                        "id": 19141,
                        "arcs": [[1757, 1758, -1755, -1641]]
                    }, {
                        "type": "Polygon",
                        "id": 19033,
                        "arcs": [[-1649, 1759, 1760, 1761, -1639]]
                    }, {
                        "type": "Polygon",
                        "id": 19081,
                        "arcs": [[-1762, 1762, -1634, -1629]]
                    }, {
                        "type": "Polygon",
                        "id": 19147,
                        "arcs": [[-1632, 1763, 1764, -1638]]
                    }, {
                        "type": "Polygon",
                        "id": 19041,
                        "arcs": [[-1765, 1765, -1758, -1635]]
                    }, {
                        "type": "Polygon",
                        "id": 26049,
                        "arcs": [[-1729, 1766, 1767, 1768, -1618, -1559]]
                    }, {
                        "type": "Polygon",
                        "id": 19037,
                        "arcs": [[-1659, 1769, 1770, 1771, -1654]]
                    }, {
                        "type": "Polygon",
                        "id": 19067,
                        "arcs": [[-1772, 1772, -1760, -1648]]
                    }, {
                        "type": "Polygon",
                        "id": 55049,
                        "arcs": [[-1587, -1742, 1773, 1774, 1775, -1621]]
                    }, {
                        "type": "Polygon",
                        "id": 55043,
                        "arcs": [[-1776, 1776, 1777, 1778, 1779, -1695, -1622]]
                    }, {
                        "type": "Polygon",
                        "id": 33011,
                        "arcs": [[-1750, 1780, 1781, 1782, 1783, -1613, -1609]]
                    }, {
                        "type": "Polygon",
                        "id": 26139,
                        "arcs": [[-1746, 1784, 1785, -1686]]
                    }, {
                        "type": "Polygon",
                        "id": 16063,
                        "arcs": [[1786, 1787, 1788, -1482, -1447]]
                    }, {
                        "type": "Polygon",
                        "id": 16047,
                        "arcs": [[-1789, 1789, 1790, 1791, -1414, -1483]]
                    }, {
                        "type": "Polygon",
                        "id": 55055,
                        "arcs": [[1792, 1793, 1794, -1739, -1591]]
                    }, {
                        "type": "Polygon",
                        "id": 16067,
                        "arcs": [[1795, 1796, -1787, -1446]]
                    }, {
                        "type": "Polygon",
                        "id": 55133,
                        "arcs": [[-1627, 1797, 1798, 1799, -1793, -1590]]
                    }, {
                        "type": "Polygon",
                        "id": 55079,
                        "arcs": [[1800, 1801, -1798, -1625]]
                    }, {
                        "type": "Polygon",
                        "id": 36053,
                        "arcs": [[-1606, 1802, 1803, 1804, -1751, -1568]]
                    }, {
                        "type": "Polygon",
                        "id": 33005,
                        "arcs": [[-1784, 1805, 1806, -1753, -1614]]
                    }, {
                        "type": "Polygon",
                        "id": 46135,
                        "arcs": [[1807, 1808, 1809, 1810, -1677, -1675]]
                    }, {
                        "type": "Polygon",
                        "id": 46009,
                        "arcs": [[-1811, 1811, -1670, -1678]]
                    }, {
                        "type": "Polygon",
                        "id": 26155,
                        "arcs": [[-1769, 1812, 1813, 1814, -1693, -1619]]
                    }, {
                        "type": "Polygon",
                        "id": 36037,
                        "arcs": [[1815, 1816, 1817, -1715, -1712, -1721]]
                    }, {
                        "type": "Polygon",
                        "id": 26067,
                        "arcs": [[1818, 1819, 1820, -1743, -1689]]
                    }, {
                        "type": "Polygon",
                        "id": 26037,
                        "arcs": [[-1815, 1821, 1822, -1819, -1694]]
                    }, {
                        "type": "Polygon",
                        "id": 16077,
                        "arcs": [[-1598, 1823, 1824, 1825, -1444]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 36029,
                        "arcs": [[[1826]], [[-1818, 1827, 1828, 1829, 1830, 1831, -1716]]]
                    }, {
                        "type": "Polygon",
                        "id": 46127,
                        "arcs": [[-1757, 1832, 1833, 1834, 1835, 1836, -1661]]
                    }, {
                        "type": "Polygon",
                        "id": 46027,
                        "arcs": [[-1837, 1837, 1838, -1808, -1674, -1662]]
                    }, {
                        "type": "Polygon",
                        "id": 19065,
                        "arcs": [[1839, 1840, 1841, -1770, -1658]]
                    }, {
                        "type": "Polygon",
                        "id": 19043,
                        "arcs": [[-1696, -1780, 1842, 1843, -1840, -1656]]
                    }, {
                        "type": "Polygon",
                        "id": 36057,
                        "arcs": [[-1706, 1844, 1845, 1846, -1419, -1747]]
                    }, {
                        "type": "Polygon",
                        "id": 36069,
                        "arcs": [[1847, 1848, 1849, 1850, -1719, -1724]]
                    }, {
                        "type": "Polygon",
                        "id": 16005,
                        "arcs": [[1851, 1852, 1853, -1824, -1597]]
                    }, {
                        "type": "Polygon",
                        "id": 16029,
                        "arcs": [[-1594, -1734, 1854, 1855, -1852, -1596]]
                    }, {
                        "type": "Polygon",
                        "id": 36099,
                        "arcs": [[1856, 1857, 1858, -1848, -1723, -1700]]
                    }, {
                        "type": "Polygon",
                        "id": 31165,
                        "arcs": [[1859, 1860, 1861, -1644, -1684, 1862]]
                    }, {
                        "type": "Polygon",
                        "id": 31161,
                        "arcs": [[1863, 1864, 1865, 1866, 1867, -1573, 1868]]
                    }, {
                        "type": "Polygon",
                        "id": 31045,
                        "arcs": [[1869, -1863, -1683, -1574, -1868]]
                    }, {
                        "type": "Polygon",
                        "id": 31015,
                        "arcs": [[1870, 1871, 1872, -1681, -1672]]
                    }, {
                        "type": "Polygon",
                        "id": 31103,
                        "arcs": [[-1873, 1873, 1874, 1875, -1552, -1682]]
                    }, {
                        "type": "Polygon",
                        "id": 31031,
                        "arcs": [[-1710, -1876, 1876, 1877, 1878, 1879, 1880, -1869, -1709]]
                    }, {
                        "type": "Polygon",
                        "id": 41029,
                        "arcs": [[-1602, 1881, 1882, -1461]]
                    }, {
                        "type": "Polygon",
                        "id": 36051,
                        "arcs": [[-1851, 1883, 1884, 1885, -1816, -1720]]
                    }, {
                        "type": "Polygon",
                        "id": 36083,
                        "arcs": [[-1738, 1886, 1887, 1888, -1703, -1546]]
                    }, {
                        "type": "Polygon",
                        "id": 36093,
                        "arcs": [[1889, 1890, -1845, -1705]]
                    }, {
                        "type": "Polygon",
                        "id": 41015,
                        "arcs": [[-1463, 1891, 1892, 1893, -1611]]
                    }, {
                        "type": "Polygon",
                        "id": 16083,
                        "arcs": [[-1791, 1894, 1895, 1896, -1580, -1415, -1792]]
                    }, {
                        "type": "Polygon",
                        "id": 19149,
                        "arcs": [[1897, 1898, -1833, -1756]]
                    }, {
                        "type": "Polygon",
                        "id": 19021,
                        "arcs": [[1899, 1900, 1901, -1766]]
                    }, {
                        "type": "Polygon",
                        "id": 19035,
                        "arcs": [[-1902, 1902, 1903, -1898, -1759]]
                    }, {
                        "type": "Polygon",
                        "id": 19151,
                        "arcs": [[1904, 1905, 1906, -1900, -1764]]
                    }, {
                        "type": "Polygon",
                        "id": 19197,
                        "arcs": [[1907, 1908, 1909, 1910, -1763]]
                    }, {
                        "type": "Polygon",
                        "id": 19091,
                        "arcs": [[-1911, 1911, -1905, -1631]]
                    }, {
                        "type": "Polygon",
                        "id": 19069,
                        "arcs": [[1912, 1913, -1908, -1761]]
                    }, {
                        "type": "Polygon",
                        "id": 19023,
                        "arcs": [[1914, 1915, 1916, -1913, -1773]]
                    }, {
                        "type": "Polygon",
                        "id": 19017,
                        "arcs": [[-1842, 1917, -1915, -1771]]
                    }, {
                        "type": "Polygon",
                        "id": 36077,
                        "arcs": [[-1847, 1918, 1919, 1920, -1803, -1605, -1420]]
                    }, {
                        "type": "Polygon",
                        "id": 31089,
                        "arcs": [[1921, 1922, 1923, 1924, 1925, 1926, -1872]]
                    }, {
                        "type": "Polygon",
                        "id": 26099,
                        "arcs": [[1927, 1928, 1929, -1727, 1930]]
                    }, {
                        "type": "Polygon",
                        "id": 26125,
                        "arcs": [[1931, 1932, 1933, -1767, -1728, -1930]]
                    }, {
                        "type": "Polygon",
                        "id": 25009,
                        "arcs": [[1934, 1935, 1936, -1781, -1749]]
                    }, {
                        "type": "Polygon",
                        "id": 31107,
                        "arcs": [[-1812, -1810, 1937, 1938, 1939, -1922, -1871, -1671]]
                    }, {
                        "type": "Polygon",
                        "id": 31027,
                        "arcs": [[-1839, 1940, 1941, 1942, -1938, -1809]]
                    }, {
                        "type": "Polygon",
                        "id": 36121,
                        "arcs": [[-1886, 1943, 1944, -1828, -1817]]
                    }, {
                        "type": "Polygon",
                        "id": 55045,
                        "arcs": [[1945, 1946, 1947, 1948, -1774, -1741]]
                    }, {
                        "type": "Polygon",
                        "id": 16053,
                        "arcs": [[-1797, 1949, -1895, -1790, -1788]]
                    }, {
                        "type": "Polygon",
                        "id": 55105,
                        "arcs": [[-1795, 1950, 1951, 1952, -1946, -1740]]
                    }, {
                        "type": "Polygon",
                        "id": 31017,
                        "arcs": [[1953, 1954, 1955, -1877, -1875]]
                    }, {
                        "type": "Polygon",
                        "id": 55127,
                        "arcs": [[-1800, 1956, 1957, 1958, 1959, -1951, -1794]]
                    }, {
                        "type": "Polygon",
                        "id": 55101,
                        "arcs": [[1960, 1961, -1957, -1799, -1802]]
                    }, {
                        "type": "Polygon",
                        "id": 36095,
                        "arcs": [[-1891, 1962, 1963, 1964, -1919, -1846]]
                    }, {
                        "type": "Polygon",
                        "id": 36001,
                        "arcs": [[-1889, 1965, -1963, -1890, -1704]]
                    }, {
                        "type": "Polygon",
                        "id": 55065,
                        "arcs": [[-1949, 1966, 1967, -1777, -1775]]
                    }, {
                        "type": "Polygon",
                        "id": 31149,
                        "arcs": [[1968, -1954, -1874, -1927]]
                    }, {
                        "type": "Polygon",
                        "id": 36023,
                        "arcs": [[1969, 1970, -1698, -1752, -1805, 1971, 1972]]
                    }, {
                        "type": "Polygon",
                        "id": 41033,
                        "arcs": [[-1462, -1883, 1973, 1974, -1892]]
                    }, {
                        "type": "Polygon",
                        "id": 26093,
                        "arcs": [[-1934, 1975, 1976, 1977, -1813, -1768]]
                    }, {
                        "type": "Polygon",
                        "id": 26065,
                        "arcs": [[-1978, 1978, 1979, -1822, -1814]]
                    }, {
                        "type": "Polygon",
                        "id": 26045,
                        "arcs": [[-1823, -1980, 1980, 1981, 1982, -1820]]
                    }, {
                        "type": "Polygon",
                        "id": 26015,
                        "arcs": [[-1983, 1983, 1984, 1985, -1744, -1821]]
                    }, {
                        "type": "Polygon",
                        "id": 26005,
                        "arcs": [[-1745, -1986, 1986, 1987, 1988, -1785]]
                    }, {
                        "type": "Polygon",
                        "id": 36123,
                        "arcs": [[1989, 1990, -1849, -1859]]
                    }, {
                        "type": "Polygon",
                        "id": 31051,
                        "arcs": [[-1836, 1991, 1992, 1993, -1941, -1838]]
                    }, {
                        "type": "Polygon",
                        "id": 25003,
                        "arcs": [[1994, 1995, 1996, 1997, 1998, 1999, -1887, -1737]]
                    }, {
                        "type": "Polygon",
                        "id": 36017,
                        "arcs": [[-1921, 2000, 2001, 2002, -1972, -1804]]
                    }, {
                        "type": "Polygon",
                        "id": 25011,
                        "arcs": [[2003, -1995, -1736, -1754, -1807, 2004]]
                    }, {
                        "type": "Polygon",
                        "id": 25017,
                        "arcs": [[2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, -1782, -1937]]
                    }, {
                        "type": "Polygon",
                        "id": 25027,
                        "arcs": [[-1783, -2014, 2014, 2015, 2016, 2017, 2018, 2019, -2005, -1806]]
                    }, {
                        "type": "Polygon",
                        "id": 16031,
                        "arcs": [[-1826, 2020, 2021, 2022, -1896, -1950, -1796, -1445]]
                    }, {
                        "type": "Polygon",
                        "id": 19061,
                        "arcs": [[2023, 2024, 2025, 2026, -1843, -1779]]
                    }, {
                        "type": "Polygon",
                        "id": 55059,
                        "arcs": [[2027, 2028, 2029, -1958, -1962]]
                    }, {
                        "type": "Polygon",
                        "id": 19055,
                        "arcs": [[-2027, 2030, 2031, 2032, -1844]]
                    }, {
                        "type": "Polygon",
                        "id": 19187,
                        "arcs": [[-1910, 2033, 2034, 2035, 2036, -1906, -1912]]
                    }, {
                        "type": "Polygon",
                        "id": 19019,
                        "arcs": [[-2033, 2037, 2038, 2039, -1841]]
                    }, {
                        "type": "Polygon",
                        "id": 19013,
                        "arcs": [[-2040, 2040, 2041, 2042, -1916, -1918]]
                    }, {
                        "type": "Polygon",
                        "id": 36109,
                        "arcs": [[-1971, 2043, 2044, 2045, -1857, -1699]]
                    }, {
                        "type": "Polygon",
                        "id": 56015,
                        "arcs": [[-1862, 2046, 2047, 2048, 2049, -1645]]
                    }, {
                        "type": "Polygon",
                        "id": 56031,
                        "arcs": [[-2050, 2050, 2051, -1664, -1646]]
                    }, {
                        "type": "Polygon",
                        "id": 16007,
                        "arcs": [[-1733, 2052, 2053, -1855]]
                    }, {
                        "type": "Polygon",
                        "id": 36101,
                        "arcs": [[-1850, -1991, 2054, 2055, 2056, 2057, 2058, -1884]]
                    }, {
                        "type": "Polygon",
                        "id": 36013,
                        "arcs": [[2059, 2060, 2061, 2062, -1831]]
                    }, {
                        "type": "Polygon",
                        "id": 19193,
                        "arcs": [[-1904, 2063, 2064, 2065, 2066, -1834, -1899]]
                    }, {
                        "type": "Polygon",
                        "id": 19161,
                        "arcs": [[2067, 2068, 2069, 2070, -1901]]
                    }, {
                        "type": "Polygon",
                        "id": 19093,
                        "arcs": [[-2071, 2071, -2064, -1903]]
                    }, {
                        "type": "Polygon",
                        "id": 19025,
                        "arcs": [[-2037, 2072, 2073, -2068, -1907]]
                    }, {
                        "type": "Polygon",
                        "id": 19079,
                        "arcs": [[2074, 2075, 2076, -2034, -1909]]
                    }, {
                        "type": "Polygon",
                        "id": 19083,
                        "arcs": [[-1914, 2077, 2078, 2079, -2075]]
                    }, {
                        "type": "Polygon",
                        "id": 19075,
                        "arcs": [[-2043, 2080, 2081, -2078, -1917]]
                    }, {
                        "type": "Polygon",
                        "id": 25015,
                        "arcs": [[-2020, 2082, -1996, -2004]]
                    }, {
                        "type": "Polygon",
                        "id": 36097,
                        "arcs": [[-2046, 2083, -2055, -1990, -1858]]
                    }, {
                        "type": "Polygon",
                        "id": 36009,
                        "arcs": [[-1829, -1945, 2084, 2085, 2086, -2060, -1830]]
                    }, {
                        "type": "Polygon",
                        "id": 31043,
                        "arcs": [[-1835, -2067, 2087, -1992]]
                    }, {
                        "type": "Polygon",
                        "id": 36003,
                        "arcs": [[-1885, -2059, 2088, 2089, -2085, -1944]]
                    }, {
                        "type": "Polygon",
                        "id": 36025,
                        "arcs": [[-1965, 2090, 2091, 2092, 2093, 2094, -2001, -1920]]
                    }, {
                        "type": "Polygon",
                        "id": 17085,
                        "arcs": [[-1968, 2095, 2096, 2097, -2024, -1778]]
                    }, {
                        "type": "Polygon",
                        "id": 36021,
                        "arcs": [[2098, 2099, 2100, -1888, -2000]]
                    }, {
                        "type": "Polygon",
                        "id": 17177,
                        "arcs": [[2101, -2096, -1967, -1948, 2102, 2103]]
                    }, {
                        "type": "Polygon",
                        "id": 17201,
                        "arcs": [[2104, 2105, -2103, -1947, -1953]]
                    }, {
                        "type": "Polygon",
                        "id": 16071,
                        "arcs": [[-1854, 2106, 2107, 2108, -2021, -1825]]
                    }, {
                        "type": "Polygon",
                        "id": 17111,
                        "arcs": [[2109, 2110, 2111, 2112, 2113, -1959, -2030]]
                    }, {
                        "type": "Polygon",
                        "id": 17007,
                        "arcs": [[-1960, -2114, 2114, -2105, -1952]]
                    }, {
                        "type": "Polygon",
                        "id": 17097,
                        "arcs": [[2115, -2110, -2029, 2116]]
                    }, {
                        "type": "Polygon",
                        "id": 36039,
                        "arcs": [[2117, -2091, -1964, -1966, -2101]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 25025,
                        "arcs": [[[2118, 2119, -2012, 2120, -2010]]]
                    }, {
                        "type": "Polygon",
                        "id": 31139,
                        "arcs": [[2121, 2122, 2123, -1939, -1943]]
                    }, {
                        "type": "Polygon",
                        "id": 31013,
                        "arcs": [[2124, 2125, -1860, -1870, -1867]]
                    }, {
                        "type": "Polygon",
                        "id": 31003,
                        "arcs": [[-2124, 2126, 2127, 2128, -1923, -1940]]
                    }, {
                        "type": "Polygon",
                        "id": 26161,
                        "arcs": [[2129, 2130, 2131, -1976, -1933, 2132]]
                    }, {
                        "type": "Polygon",
                        "id": 56007,
                        "arcs": [[-1666, 2133, 2134, 2135, 2136, 2137, -1432, -1680]]
                    }, {
                        "type": "Polygon",
                        "id": 56001,
                        "arcs": [[-2052, 2138, 2139, 2140, -2134, -1665]]
                    }, {
                        "type": "Polygon",
                        "id": 16041,
                        "arcs": [[-2054, 2141, -2107, -1853, -1856]]
                    }, {
                        "type": "Polygon",
                        "id": 26075,
                        "arcs": [[-1977, -2132, 2142, 2143, 2144, -1981, -1979]]
                    }, {
                        "type": "Polygon",
                        "id": 26025,
                        "arcs": [[-2145, 2145, 2146, 2147, -1984, -1982]]
                    }, {
                        "type": "Polygon",
                        "id": 26159,
                        "arcs": [[2148, 2149, 2150, 2151, -1988]]
                    }, {
                        "type": "Polygon",
                        "id": 26077,
                        "arcs": [[-2148, 2152, -2149, -1987, -1985]]
                    }, {
                        "type": "Polygon",
                        "id": 36007,
                        "arcs": [[-2002, -2095, 2153, 2154, 2155, -1973, -2003]]
                    }, {
                        "type": "Polygon",
                        "id": 36107,
                        "arcs": [[-2156, 2156, 2157, 2158, -2044, -1970]]
                    }, {
                        "type": "Polygon",
                        "id": 19097,
                        "arcs": [[-2098, 2159, 2160, 2161, -2025]]
                    }, {
                        "type": "Polygon",
                        "id": 31179,
                        "arcs": [[-1994, 2162, 2163, 2164, -2122, -1942]]
                    }, {
                        "type": "Polygon",
                        "id": 25021,
                        "arcs": [[-2120, 2165, 2166, 2167, 2168, -2015, -2013]]
                    }, {
                        "type": "Polygon",
                        "id": 25013,
                        "arcs": [[-2019, 2169, 2170, 2171, -1997, -2083]]
                    }, {
                        "type": "Polygon",
                        "id": 25023,
                        "arcs": [[2172, 2173, 2174, 2175, 2176, -2167, 2177]]
                    }, {
                        "type": "Polygon",
                        "id": 19011,
                        "arcs": [[2178, 2179, 2180, -2041, -2039]]
                    }, {
                        "type": "Polygon",
                        "id": 19113,
                        "arcs": [[-2032, 2181, 2182, 2183, -2179, -2038]]
                    }, {
                        "type": "Polygon",
                        "id": 19171,
                        "arcs": [[-2181, 2184, 2185, -2081, -2042]]
                    }, {
                        "type": "Polygon",
                        "id": 19105,
                        "arcs": [[-2026, -2162, 2186, 2187, -2182, -2031]]
                    }, {
                        "type": "Polygon",
                        "id": 36015,
                        "arcs": [[-2045, -2159, 2188, 2189, -2056, -2084]]
                    }, {
                        "type": "Polygon",
                        "id": 31173,
                        "arcs": [[-2066, 2190, 2191, 2192, -2163, -1993, -2088]]
                    }, {
                        "type": "Polygon",
                        "id": 56037,
                        "arcs": [[-1433, -2138, 2193, 2194, 2195, 2196, -1730, -1691]]
                    }, {
                        "type": "Polygon",
                        "id": 42049,
                        "arcs": [[2197, 2198, 2199, 2200, -2062]]
                    }, {
                        "type": "Polygon",
                        "id": 26021,
                        "arcs": [[2201, 2202, 2203, 2204, -2151]]
                    }, {
                        "type": "Polygon",
                        "id": 19133,
                        "arcs": [[2205, 2206, 2207, -2191, -2065]]
                    }, {
                        "type": "Polygon",
                        "id": 19127,
                        "arcs": [[-2186, 2208, 2209, -2079, -2082]]
                    }, {
                        "type": "Polygon",
                        "id": 19027,
                        "arcs": [[-2074, 2210, 2211, 2212, 2213, -2069]]
                    }, {
                        "type": "Polygon",
                        "id": 19047,
                        "arcs": [[-2072, -2070, -2214, 2214, 2215, -2206]]
                    }, {
                        "type": "Polygon",
                        "id": 19015,
                        "arcs": [[-2077, 2216, 2217, 2218, 2219, -2035]]
                    }, {
                        "type": "Polygon",
                        "id": 19073,
                        "arcs": [[-2220, 2220, 2221, -2211, -2073, -2036]]
                    }, {
                        "type": "Polygon",
                        "id": 19169,
                        "arcs": [[-2080, -2210, 2222, 2223, -2217, -2076]]
                    }, {
                        "type": "Polygon",
                        "id": 17141,
                        "arcs": [[2224, 2225, 2226, 2227, -2104, -2106]]
                    }, {
                        "type": "Polygon",
                        "id": 17015,
                        "arcs": [[-2228, 2228, 2229, -2160, -2097, -2102]]
                    }, {
                        "type": "Polygon",
                        "id": 36111,
                        "arcs": [[-2100, 2230, 2231, 2232, -2092, -2118]]
                    }, {
                        "type": "Polygon",
                        "id": 17031,
                        "arcs": [[-2116, 2233, 2234, 2235, 2236, 2237, 2238, -2111]]
                    }, {
                        "type": "Polygon",
                        "id": 17037,
                        "arcs": [[2239, 2240, 2241, 2242, -2225, -2115, -2113]]
                    }, {
                        "type": "Polygon",
                        "id": 17089,
                        "arcs": [[-2239, 2243, 2244, -2240, -2112]]
                    }, {
                        "type": "Polygon",
                        "id": 31075,
                        "arcs": [[2245, 2246, 2247, -1864, -1881]]
                    }, {
                        "type": "Polygon",
                        "id": 25005,
                        "arcs": [[2248, 2249, 2250, 2251, 2252, -2168, -2177]]
                    }, {
                        "type": "Polygon",
                        "id": 31091,
                        "arcs": [[2253, 2254, 2255, -2246, -1880]]
                    }, {
                        "type": "Polygon",
                        "id": 31039,
                        "arcs": [[-2193, 2256, 2257, 2258, 2259, -2164]]
                    }, {
                        "type": "Polygon",
                        "id": 31119,
                        "arcs": [[2260, 2261, 2262, -2127, -2123]]
                    }, {
                        "type": "Polygon",
                        "id": 31167,
                        "arcs": [[-2260, 2263, 2264, -2261, -2165]]
                    }, {
                        "type": "Polygon",
                        "id": 31171,
                        "arcs": [[2265, 2266, 2267, -2254, -1879]]
                    }, {
                        "type": "Polygon",
                        "id": 31183,
                        "arcs": [[2268, 2269, 2270, 2271, -1924, -2129]]
                    }, {
                        "type": "Polygon",
                        "id": 31009,
                        "arcs": [[-1878, -1956, 2272, 2273, 2274, -2266]]
                    }, {
                        "type": "Polygon",
                        "id": 31115,
                        "arcs": [[2275, 2276, -2273, -1955, -1969, -1926]]
                    }, {
                        "type": "Polygon",
                        "id": 31071,
                        "arcs": [[-2272, 2277, 2278, -2276, -1925]]
                    }, {
                        "type": "Polygon",
                        "id": 26091,
                        "arcs": [[2279, 2280, 2281, 2282, -2143, -2131]]
                    }, {
                        "type": "Polygon",
                        "id": 36027,
                        "arcs": [[-1999, 2283, 2284, 2285, 2286, -2231, -2099]]
                    }, {
                        "type": "Polygon",
                        "id": 25001,
                        "arcs": [[-2175, 2287]]
                    }, {
                        "type": "Polygon",
                        "id": 26023,
                        "arcs": [[2288, 2289, 2290, 2291, -2147]]
                    }, {
                        "type": "Polygon",
                        "id": 26059,
                        "arcs": [[-2283, 2292, 2293, 2294, -2289, -2146, -2144]]
                    }, {
                        "type": "Polygon",
                        "id": 26149,
                        "arcs": [[-2292, 2295, 2296, 2297, -2153]]
                    }, {
                        "type": "Polygon",
                        "id": 26027,
                        "arcs": [[-2298, 2298, 2299, -2202, -2150]]
                    }, {
                        "type": "Polygon",
                        "id": 9005,
                        "arcs": [[-2172, 2300, 2301, 2302, -2284, -1998]]
                    }, {
                        "type": "Polygon",
                        "id": 31021,
                        "arcs": [[2303, 2304, 2305, -2257, -2192, -2208]]
                    }, {
                        "type": "Polygon",
                        "id": 9003,
                        "arcs": [[2306, 2307, 2308, 2309, -2301, -2171]]
                    }, {
                        "type": "Polygon",
                        "id": 9013,
                        "arcs": [[-2018, 2310, 2311, -2307, -2170]]
                    }, {
                        "type": "Polygon",
                        "id": 19045,
                        "arcs": [[-2230, 2312, 2313, 2314, 2315, 2316, -2187, -2161]]
                    }, {
                        "type": "Polygon",
                        "id": 9015,
                        "arcs": [[2317, 2318, 2319, -2311, -2017]]
                    }, {
                        "type": "Polygon",
                        "id": 44007,
                        "arcs": [[-2253, 2320, 2321, 2322, -2318, -2016, -2169]]
                    }, {
                        "type": "Polygon",
                        "id": 36105,
                        "arcs": [[2323, 2324, 2325, -2093, -2233]]
                    }, {
                        "type": "Polygon",
                        "id": 6093,
                        "arcs": [[-1601, 2326, 2327, 2328, 2329, 2330, -1974, -1882]]
                    }, {
                        "type": "Polygon",
                        "id": 31069,
                        "arcs": [[-2248, 2331, 2332, 2333, 2334, 2335, -1865]]
                    }, {
                        "type": "Polygon",
                        "id": 31123,
                        "arcs": [[-2336, 2336, 2337, 2338, -2125, -1866]]
                    }, {
                        "type": "Polygon",
                        "id": 49005,
                        "arcs": [[2339, 2340, 2341, -2108, -2142]]
                    }, {
                        "type": "Polygon",
                        "id": 31157,
                        "arcs": [[-2339, 2342, -2047, -1861, -2126]]
                    }, {
                        "type": "Polygon",
                        "id": 49033,
                        "arcs": [[-1732, 2343, 2344, 2345, 2346, -2340, -2053]]
                    }, {
                        "type": "Polygon",
                        "id": 42015,
                        "arcs": [[-2189, -2158, 2347, 2348, 2349, 2350, 2351]]
                    }, {
                        "type": "Polygon",
                        "id": 42117,
                        "arcs": [[-2190, -2352, 2352, 2353, -2057]]
                    }, {
                        "type": "Polygon",
                        "id": 49003,
                        "arcs": [[2354, 2355, 2356, -2022, -2109, -2342]]
                    }, {
                        "type": "Polygon",
                        "id": 32013,
                        "arcs": [[2357, 2358, 2359, -1428, -1264, -1582, 2360]]
                    }, {
                        "type": "Polygon",
                        "id": 32007,
                        "arcs": [[-2023, -2357, 2361, 2362, 2363, 2364, -2361, -1581, -1897]]
                    }, {
                        "type": "Polygon",
                        "id": 42083,
                        "arcs": [[-2090, 2365, 2366, 2367, 2368, -2086]]
                    }, {
                        "type": "Polygon",
                        "id": 42105,
                        "arcs": [[-2058, -2354, 2369, 2370, 2371, -2366, -2089]]
                    }, {
                        "type": "Polygon",
                        "id": 6015,
                        "arcs": [[-2331, 2372, 2373, -1893, -1975]]
                    }, {
                        "type": "Polygon",
                        "id": 42127,
                        "arcs": [[-2094, -2326, 2374, 2375, 2376, 2377, -2154]]
                    }, {
                        "type": "Polygon",
                        "id": 42115,
                        "arcs": [[2378, 2379, -2348, -2157, -2155, -2378]]
                    }, {
                        "type": "Polygon",
                        "id": 42123,
                        "arcs": [[-2369, 2380, 2381, 2382, -2198, -2061, -2087]]
                    }, {
                        "type": "Polygon",
                        "id": 6049,
                        "arcs": [[-1604, 2383, 2384, 2385, -2327, -1600]]
                    }, {
                        "type": "Polygon",
                        "id": 32031,
                        "arcs": [[2386, 2387, 2388, 2389, 2390, 2391, 2392, 2393, 2394, -2384, -1603, -1429, -2360]]
                    }, {
                        "type": "Polygon",
                        "id": 17043,
                        "arcs": [[2395, 2396, -2244, -2238]]
                    }, {
                        "type": "Polygon",
                        "id": 39007,
                        "arcs": [[2397, 2398, 2399, 2400, 2401, -2200]]
                    }, {
                        "type": "Polygon",
                        "id": 19031,
                        "arcs": [[-2188, -2317, 2402, 2403, 2404, -2183]]
                    }, {
                        "type": "Polygon",
                        "id": 17195,
                        "arcs": [[-2227, 2405, 2406, 2407, 2408, -2313, -2229]]
                    }, {
                        "type": "Polygon",
                        "id": 31011,
                        "arcs": [[-2263, 2409, 2410, 2411, -2269, -2128]]
                    }, {
                        "type": "Polygon",
                        "id": 17103,
                        "arcs": [[-2243, 2412, 2413, -2406, -2226]]
                    }, {
                        "type": "Polygon",
                        "id": 19085,
                        "arcs": [[-2216, 2414, 2415, 2416, -2304, -2207]]
                    }, {
                        "type": "Polygon",
                        "id": 19095,
                        "arcs": [[2417, 2418, 2419, 2420, -2180]]
                    }, {
                        "type": "Polygon",
                        "id": 19049,
                        "arcs": [[2421, 2422, 2423, -2221, -2219]]
                    }, {
                        "type": "Polygon",
                        "id": 19165,
                        "arcs": [[2424, 2425, 2426, -2415, -2215]]
                    }, {
                        "type": "Polygon",
                        "id": 19009,
                        "arcs": [[2427, 2428, -2425, -2213]]
                    }, {
                        "type": "Polygon",
                        "id": 19157,
                        "arcs": [[-2421, 2429, 2430, 2431, -2185]]
                    }, {
                        "type": "Polygon",
                        "id": 19153,
                        "arcs": [[-2224, 2432, 2433, 2434, -2422, -2218]]
                    }, {
                        "type": "Polygon",
                        "id": 19099,
                        "arcs": [[-2209, -2432, 2435, 2436, -2433, -2223]]
                    }, {
                        "type": "Polygon",
                        "id": 19077,
                        "arcs": [[-2424, 2437, -2428, -2212, -2222]]
                    }, {
                        "type": "Polygon",
                        "id": 19103,
                        "arcs": [[-2405, 2438, 2439, 2440, -2418, -2184]]
                    }, {
                        "type": "Polygon",
                        "id": 39085,
                        "arcs": [[2441, 2442, 2443, -2401]]
                    }, {
                        "type": "Polygon",
                        "id": 42039,
                        "arcs": [[-2383, 2444, 2445, 2446, -2398, -2199]]
                    }, {
                        "type": "Polygon",
                        "id": 17161,
                        "arcs": [[2447, 2448, 2449, 2450, 2451, -2314, -2409]]
                    }, {
                        "type": "Polygon",
                        "id": 44001,
                        "arcs": [[2452, -2321, -2252]]
                    }, {
                        "type": "Polygon",
                        "id": 19163,
                        "arcs": [[-2452, 2453, -2403, -2316, -2315]]
                    }, {
                        "type": "Polygon",
                        "id": 44003,
                        "arcs": [[2454, 2455, 2456, -2319, -2323]]
                    }, {
                        "type": "Polygon",
                        "id": 18039,
                        "arcs": [[2457, 2458, 2459, 2460, 2461, -2299, -2297]]
                    }, {
                        "type": "Polygon",
                        "id": 18141,
                        "arcs": [[2462, 2463, 2464, -2203, -2300, -2462]]
                    }, {
                        "type": "Polygon",
                        "id": 18091,
                        "arcs": [[2465, 2466, 2467, -2204, -2465]]
                    }, {
                        "type": "Polygon",
                        "id": 18151,
                        "arcs": [[2468, 2469, -2290, -2295, 2470]]
                    }, {
                        "type": "Polygon",
                        "id": 18087,
                        "arcs": [[2471, -2458, -2296, -2291, -2470]]
                    }, {
                        "type": "Polygon",
                        "id": 31037,
                        "arcs": [[-2259, 2472, 2473, 2474, -2264]]
                    }, {
                        "type": "Polygon",
                        "id": 31141,
                        "arcs": [[-2475, 2475, 2476, 2477, 2478, -2410, -2262, -2265]]
                    }, {
                        "type": "Polygon",
                        "id": 31053,
                        "arcs": [[-2306, 2479, 2480, 2481, 2482, -2473, -2258]]
                    }, {
                        "type": "Polygon",
                        "id": 31117,
                        "arcs": [[-2268, 2483, 2484, 2485, 2486, -2255]]
                    }, {
                        "type": "Polygon",
                        "id": 31005,
                        "arcs": [[-2487, 2487, -2332, -2247, -2256]]
                    }, {
                        "type": "Polygon",
                        "id": 31077,
                        "arcs": [[2488, 2489, 2490, 2491, -2270, -2412]]
                    }, {
                        "type": "Polygon",
                        "id": 31041,
                        "arcs": [[-2279, 2492, 2493, 2494, 2495, 2496, 2497, -2274, -2277]]
                    }, {
                        "type": "Polygon",
                        "id": 31113,
                        "arcs": [[-2275, -2498, 2498, -2484, -2267]]
                    }, {
                        "type": "Polygon",
                        "id": 31175,
                        "arcs": [[-2271, -2492, 2499, -2493, -2278]]
                    }, {
                        "type": "Polygon",
                        "id": 39095,
                        "arcs": [[2500, 2501, 2502, 2503, -2281, 2504, 2505, 2506, 2507, 2508, 2509]]
                    }, {
                        "type": "Polygon",
                        "id": 17197,
                        "arcs": [[-2237, 2510, 2511, 2512, 2513, -2396]]
                    }, {
                        "type": "Polygon",
                        "id": 39123,
                        "arcs": [[2514, 2515, 2516, 2517, 2518, -2501]]
                    }, {
                        "type": "Polygon",
                        "id": 17093,
                        "arcs": [[-2514, 2519, 2520, -2241, -2245, -2397]]
                    }, {
                        "type": "Polygon",
                        "id": 39051,
                        "arcs": [[2521, 2522, -2293, -2282, -2504]]
                    }, {
                        "type": "Polygon",
                        "id": 39055,
                        "arcs": [[2523, 2524, 2525, -2442, -2400]]
                    }, {
                        "type": "Polygon",
                        "id": 9011,
                        "arcs": [[-2457, 2526, 2527, 2528, -2308, -2312, -2320]]
                    }, {
                        "type": "Polygon",
                        "id": 18089,
                        "arcs": [[2529, 2530, 2531, 2532, -2511, -2236, 2533]]
                    }, {
                        "type": "Polygon",
                        "id": 18127,
                        "arcs": [[2534, -2530, 2535, -2467]]
                    }, {
                        "type": "Polygon",
                        "id": 39171,
                        "arcs": [[2536, 2537, 2538, -2471, -2294, -2523]]
                    }, {
                        "type": "Polygon",
                        "id": 31007,
                        "arcs": [[-2338, 2539, 2540, 2541, -2048, -2343]]
                    }, {
                        "type": "Polygon",
                        "id": 31177,
                        "arcs": [[-2417, 2542, 2543, -2480, -2305]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 44005,
                        "arcs": [[[2544]], [[2545, -2250]]]
                    }, {
                        "type": "Polygon",
                        "id": 9001,
                        "arcs": [[2546, 2547, 2548, 2549, -2285, -2303]]
                    }, {
                        "type": "Polygon",
                        "id": 56021,
                        "arcs": [[-2049, -2542, 2550, 2551, 2552, -2139, -2051]]
                    }, {
                        "type": "Polygon",
                        "id": 44009,
                        "arcs": [[-2527, -2456, 2553]]
                    }, {
                        "type": "Polygon",
                        "id": 42131,
                        "arcs": [[-2380, 2554, 2555, 2556, -2349]]
                    }, {
                        "type": "Polygon",
                        "id": 9007,
                        "arcs": [[-2529, 2557, 2558, -2309]]
                    }, {
                        "type": "Polygon",
                        "id": 9009,
                        "arcs": [[-2559, 2559, 2560, 2561, -2547, -2302, -2310]]
                    }, {
                        "type": "Polygon",
                        "id": 42069,
                        "arcs": [[-2377, 2562, 2563, -2555, -2379]]
                    }, {
                        "type": "Polygon",
                        "id": 36071,
                        "arcs": [[-2287, 2564, 2565, 2566, 2567, 2568, -2324, -2232]]
                    }, {
                        "type": "Polygon",
                        "id": 17099,
                        "arcs": [[-2521, 2569, 2570, 2571, 2572, 2573, 2574, -2413, -2242]]
                    }, {
                        "type": "Polygon",
                        "id": 39035,
                        "arcs": [[-2526, 2575, 2576, 2577, 2578, 2579, -2443]]
                    }, {
                        "type": "Polygon",
                        "id": 42047,
                        "arcs": [[2580, 2581, 2582, 2583, -2368]]
                    }, {
                        "type": "Polygon",
                        "id": 42053,
                        "arcs": [[-2584, 2584, 2585, 2586, -2381]]
                    }, {
                        "type": "Polygon",
                        "id": 42121,
                        "arcs": [[2587, 2588, 2589, -2445, -2382, -2587]]
                    }, {
                        "type": "Polygon",
                        "id": 39043,
                        "arcs": [[2590, 2591, 2592, 2593, 2594, 2595]]
                    }, {
                        "type": "Polygon",
                        "id": 39173,
                        "arcs": [[-2519, 2596, 2597, 2598, 2599, -2502]]
                    }, {
                        "type": "Polygon",
                        "id": 42023,
                        "arcs": [[-2372, 2600, 2601, -2581, -2367]]
                    }, {
                        "type": "Polygon",
                        "id": 42103,
                        "arcs": [[-2569, 2602, 2603, -2375, -2325]]
                    }, {
                        "type": "Polygon",
                        "id": 19139,
                        "arcs": [[-2404, -2454, -2451, 2604, -2439]]
                    }, {
                        "type": "Polygon",
                        "id": 42081,
                        "arcs": [[2605, 2606, 2607, 2608, 2609, 2610, -2370, -2353, -2351]]
                    }, {
                        "type": "Polygon",
                        "id": 42113,
                        "arcs": [[-2606, -2350, -2557, 2611, 2612]]
                    }, {
                        "type": "Polygon",
                        "id": 17011,
                        "arcs": [[-2575, 2613, 2614, 2615, 2616, -2407, -2414]]
                    }, {
                        "type": "Polygon",
                        "id": 17073,
                        "arcs": [[-2617, 2617, 2618, 2619, -2448, -2408]]
                    }, {
                        "type": "Polygon",
                        "id": 56041,
                        "arcs": [[-2197, 2620, -2344, -1731]]
                    }, {
                        "type": "Polygon",
                        "id": 18033,
                        "arcs": [[2621, 2622, 2623, -2469, -2539]]
                    }, {
                        "type": "Polygon",
                        "id": 18113,
                        "arcs": [[-2624, 2624, 2625, 2626, -2459, -2472]]
                    }, {
                        "type": "Polygon",
                        "id": 31125,
                        "arcs": [[2627, 2628, -2489, -2411, -2479]]
                    }, {
                        "type": "Polygon",
                        "id": 36079,
                        "arcs": [[2629, 2630, -2565, -2286, -2550, 2631]]
                    }, {
                        "type": "Polygon",
                        "id": 25007,
                        "arcs": [[2632]]
                    }, {
                        "type": "Polygon",
                        "id": 39093,
                        "arcs": [[-2579, 2633, 2634, 2635, -2591, 2636]]
                    }, {
                        "type": "Polygon",
                        "id": 19183,
                        "arcs": [[2637, 2638, 2639, 2640, -2419, -2441]]
                    }, {
                        "type": "Polygon",
                        "id": 19181,
                        "arcs": [[2641, 2642, 2643, 2644, -2435]]
                    }, {
                        "type": "Polygon",
                        "id": 19107,
                        "arcs": [[-2641, 2645, 2646, 2647, -2430, -2420]]
                    }, {
                        "type": "Polygon",
                        "id": 19121,
                        "arcs": [[2648, 2649, 2650, -2423, -2645]]
                    }, {
                        "type": "Polygon",
                        "id": 19123,
                        "arcs": [[-2648, 2651, 2652, 2653, -2436, -2431]]
                    }, {
                        "type": "Polygon",
                        "id": 19125,
                        "arcs": [[-2654, 2654, 2655, -2642, -2434, -2437]]
                    }, {
                        "type": "Polygon",
                        "id": 19155,
                        "arcs": [[-2427, 2656, 2657, 2658, 2659, 2660, -2543, -2416]]
                    }, {
                        "type": "Polygon",
                        "id": 19029,
                        "arcs": [[-2429, 2661, 2662, 2663, -2657, -2426]]
                    }, {
                        "type": "Polygon",
                        "id": 19001,
                        "arcs": [[-2438, -2651, 2664, 2665, -2662]]
                    }, {
                        "type": "Polygon",
                        "id": 39155,
                        "arcs": [[-2447, 2666, 2667, 2668, -2524, -2399]]
                    }, {
                        "type": "Polygon",
                        "id": 39143,
                        "arcs": [[2669, -2593, 2670, 2671, -2597, -2518]]
                    }, {
                        "type": "Polygon",
                        "id": 42085,
                        "arcs": [[-2590, 2672, 2673, 2674, -2667, -2446]]
                    }, {
                        "type": "Polygon",
                        "id": 39069,
                        "arcs": [[-2503, -2600, 2675, 2676, -2537, -2522]]
                    }, {
                        "type": "Polygon",
                        "id": 18099,
                        "arcs": [[-2461, 2677, 2678, 2679, -2463]]
                    }, {
                        "type": "Polygon",
                        "id": 42035,
                        "arcs": [[-2611, 2680, 2681, 2682, -2601, -2371]]
                    }, {
                        "type": "Polygon",
                        "id": 6023,
                        "arcs": [[-2330, 2683, 2684, 2685, -2373]]
                    }, {
                        "type": "Polygon",
                        "id": 17063,
                        "arcs": [[2686, 2687, -2570, -2520, -2513]]
                    }, {
                        "type": "Polygon",
                        "id": 31023,
                        "arcs": [[-2483, 2688, 2689, 2690, 2691, -2476, -2474]]
                    }, {
                        "type": "Polygon",
                        "id": 31155,
                        "arcs": [[2692, 2693, 2694, 2695, -2689, -2482]]
                    }, {
                        "type": "Polygon",
                        "id": 18085,
                        "arcs": [[-2627, 2696, 2697, 2698, -2678, -2460]]
                    }, {
                        "type": "Polygon",
                        "id": 31033,
                        "arcs": [[-2335, 2699, 2700, 2701, 2702, -2540, -2337]]
                    }, {
                        "type": "Polygon",
                        "id": 42031,
                        "arcs": [[2703, 2704, 2705, -2588, -2586]]
                    }, {
                        "type": "Polygon",
                        "id": 49057,
                        "arcs": [[-2341, -2347, 2706, 2707, -2355]]
                    }, {
                        "type": "Polygon",
                        "id": 18149,
                        "arcs": [[-2680, 2708, 2709, -2466, -2464]]
                    }, {
                        "type": "Polygon",
                        "id": 42079,
                        "arcs": [[2710, 2711, 2712, 2713, -2612, -2556, -2564]]
                    }, {
                        "type": "Polygon",
                        "id": 39039,
                        "arcs": [[2714, 2715, 2716, -2622, -2538, -2677]]
                    }, {
                        "type": "Polygon",
                        "id": 19115,
                        "arcs": [[-2605, -2450, 2717, 2718, 2719, -2638, -2440]]
                    }, {
                        "type": "Polygon",
                        "id": 31101,
                        "arcs": [[2720, 2721, 2722, -2333, -2488, -2486]]
                    }, {
                        "type": "Polygon",
                        "id": 31111,
                        "arcs": [[-2499, -2497, 2723, 2724, 2725, 2726, -2721, -2485]]
                    }, {
                        "type": "Polygon",
                        "id": 25019,
                        "arcs": [[2727]]
                    }, {
                        "type": "Polygon",
                        "id": 31143,
                        "arcs": [[2728, 2729, 2730, -2477, -2692]]
                    }, {
                        "type": "Polygon",
                        "id": 31105,
                        "arcs": [[-2703, 2731, 2732, -2551, -2541]]
                    }, {
                        "type": "Polygon",
                        "id": 31121,
                        "arcs": [[-2731, 2733, 2734, 2735, -2628, -2478]]
                    }, {
                        "type": "Polygon",
                        "id": 31093,
                        "arcs": [[-2629, -2736, 2736, 2737, 2738, -2490]]
                    }, {
                        "type": "Polygon",
                        "id": 31163,
                        "arcs": [[-2491, -2739, 2739, -2494, -2500]]
                    }, {
                        "type": "Polygon",
                        "id": 31055,
                        "arcs": [[-2544, -2661, 2740, -2693, -2481]]
                    }, {
                        "type": "Polygon",
                        "id": 49029,
                        "arcs": [[2741, 2742, 2743, -2707, -2346]]
                    }, {
                        "type": "Polygon",
                        "id": 42065,
                        "arcs": [[2744, 2745, 2746, -2704, -2585, -2583]]
                    }, {
                        "type": "Polygon",
                        "id": 6105,
                        "arcs": [[2747, 2748, 2749, -2684, -2329]]
                    }, {
                        "type": "Polygon",
                        "id": 36119,
                        "arcs": [[2750, 2751, -2632, -2549, 2752]]
                    }, {
                        "type": "Polygon",
                        "id": 34037,
                        "arcs": [[2753, 2754, 2755, 2756, -2603, -2568]]
                    }, {
                        "type": "Polygon",
                        "id": 39153,
                        "arcs": [[2757, 2758, 2759, 2760, -2577]]
                    }, {
                        "type": "Polygon",
                        "id": 39133,
                        "arcs": [[-2669, 2761, 2762, -2758, -2576, -2525]]
                    }, {
                        "type": "Polygon",
                        "id": 17131,
                        "arcs": [[-2620, 2763, 2764, 2765, 2766, -2718, -2449]]
                    }, {
                        "type": "Polygon",
                        "id": 17155,
                        "arcs": [[-2574, 2767, -2614]]
                    }, {
                        "type": "Polygon",
                        "id": 36087,
                        "arcs": [[2768, 2769, -2566, -2631, 2770]]
                    }, {
                        "type": "Polygon",
                        "id": 42037,
                        "arcs": [[2771, 2772, 2773, -2607, -2613, -2714]]
                    }, {
                        "type": "Polygon",
                        "id": 17091,
                        "arcs": [[-2533, 2774, 2775, 2776, 2777, -2687, -2512]]
                    }, {
                        "type": "Polygon",
                        "id": 18183,
                        "arcs": [[2778, 2779, 2780, -2697, -2626]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 36103,
                        "arcs": [[[2781, 2782]]]
                    }, {
                        "type": "Polygon",
                        "id": 39077,
                        "arcs": [[-2636, 2783, 2784, 2785, 2786, -2671, -2592]]
                    }, {
                        "type": "Polygon",
                        "id": 18073,
                        "arcs": [[-2710, 2787, 2788, 2789, 2790, -2531, -2535]]
                    }, {
                        "type": "Polygon",
                        "id": 39103,
                        "arcs": [[-2761, 2791, 2792, -2634, -2578]]
                    }, {
                        "type": "Polygon",
                        "id": 18003,
                        "arcs": [[2793, 2794, 2795, 2796, 2797, -2779, -2625, -2623, -2717]]
                    }, {
                        "type": "Polygon",
                        "id": 39147,
                        "arcs": [[-2787, 2798, 2799, 2800, -2598, -2672]]
                    }, {
                        "type": "Polygon",
                        "id": 42033,
                        "arcs": [[2801, 2802, 2803, 2804, -2745, -2582, -2602, -2683]]
                    }, {
                        "type": "Polygon",
                        "id": 49043,
                        "arcs": [[-2621, -2196, 2805, 2806, 2807, 2808, -2742, -2345]]
                    }, {
                        "type": "Polygon",
                        "id": 42027,
                        "arcs": [[2809, 2810, 2811, 2812, -2802, -2682]]
                    }, {
                        "type": "Polygon",
                        "id": 42089,
                        "arcs": [[-2757, 2813, 2814, 2815, -2711, -2563, -2376, -2604]]
                    }, {
                        "type": "Polygon",
                        "id": 39125,
                        "arcs": [[2816, 2817, -2794, -2716]]
                    }, {
                        "type": "Polygon",
                        "id": 17175,
                        "arcs": [[-2616, 2818, 2819, 2820, -2618]]
                    }, {
                        "type": "Polygon",
                        "id": 31049,
                        "arcs": [[-2723, 2821, 2822, -2700, -2334]]
                    }, {
                        "type": "Polygon",
                        "id": 18111,
                        "arcs": [[2823, 2824, -2775, -2532, -2791]]
                    }, {
                        "type": "Polygon",
                        "id": 34031,
                        "arcs": [[2825, 2826, -2754, -2567, -2770, 2827]]
                    }, {
                        "type": "Polygon",
                        "id": 31153,
                        "arcs": [[-2660, 2828, 2829, -2694, -2741]]
                    }, {
                        "type": "Polygon",
                        "id": 6035,
                        "arcs": [[-2395, 2830, 2831, 2832, -2385]]
                    }, {
                        "type": "Polygon",
                        "id": 6089,
                        "arcs": [[-2386, -2833, 2833, 2834, -2748, -2328]]
                    }, {
                        "type": "Polygon",
                        "id": 42097,
                        "arcs": [[2835, -2773, 2836, 2837, 2838, 2839, 2840, -2609]]
                    }, {
                        "type": "Polygon",
                        "id": 18049,
                        "arcs": [[2841, 2842, 2843, 2844, -2679, -2699]]
                    }, {
                        "type": "Polygon",
                        "id": 31081,
                        "arcs": [[2845, 2846, 2847, 2848, -2734, -2730]]
                    }, {
                        "type": "Polygon",
                        "id": 18131,
                        "arcs": [[-2845, 2849, 2850, -2788, -2709]]
                    }, {
                        "type": "Polygon",
                        "id": 42093,
                        "arcs": [[-2774, -2836, -2608]]
                    }, {
                        "type": "Polygon",
                        "id": 42019,
                        "arcs": [[-2706, 2851, 2852, 2853, 2854, -2673, -2589]]
                    }, {
                        "type": "Polygon",
                        "id": 42005,
                        "arcs": [[-2747, 2855, 2856, 2857, -2852, -2705]]
                    }, {
                        "type": "Polygon",
                        "id": 39063,
                        "arcs": [[-2801, 2858, 2859, 2860, 2861, -2599]]
                    }, {
                        "type": "Polygon",
                        "id": 39137,
                        "arcs": [[-2862, 2862, 2863, -2817, -2715, -2676]]
                    }, {
                        "type": "Polygon",
                        "id": 19101,
                        "arcs": [[-2640, 2864, 2865, 2866, -2646]]
                    }, {
                        "type": "Polygon",
                        "id": 19087,
                        "arcs": [[-2720, 2867, 2868, 2869, -2865, -2639]]
                    }, {
                        "type": "Polygon",
                        "id": 19179,
                        "arcs": [[-2867, 2870, 2871, -2652, -2647]]
                    }, {
                        "type": "Polygon",
                        "id": 19039,
                        "arcs": [[2872, 2873, 2874, -2649, -2644]]
                    }, {
                        "type": "Polygon",
                        "id": 19117,
                        "arcs": [[-2656, 2875, 2876, -2873, -2643]]
                    }, {
                        "type": "Polygon",
                        "id": 19135,
                        "arcs": [[-2872, 2877, -2876, -2655, -2653]]
                    }, {
                        "type": "Polygon",
                        "id": 19129,
                        "arcs": [[2878, 2879, 2880, -2829, -2659]]
                    }, {
                        "type": "Polygon",
                        "id": 19137,
                        "arcs": [[-2664, 2881, 2882, -2879, -2658]]
                    }, {
                        "type": "Polygon",
                        "id": 19003,
                        "arcs": [[-2666, 2883, 2884, -2882, -2663]]
                    }, {
                        "type": "Polygon",
                        "id": 19175,
                        "arcs": [[-2650, -2875, 2885, -2884, -2665]]
                    }, {
                        "type": "Polygon",
                        "id": 49011,
                        "arcs": [[-2744, 2886, 2887, -2708]]
                    }, {
                        "type": "Polygon",
                        "id": 17095,
                        "arcs": [[-2821, 2888, 2889, 2890, -2764, -2619]]
                    }, {
                        "type": "Polygon",
                        "id": 42119,
                        "arcs": [[2891, 2892, -2810, -2681, -2610, -2841]]
                    }, {
                        "type": "Polygon",
                        "id": 17123,
                        "arcs": [[-2768, -2573, 2893, 2894, -2819, -2615]]
                    }, {
                        "type": "Polygon",
                        "id": 34003,
                        "arcs": [[2895, 2896, -2828, -2769, 2897]]
                    }, {
                        "type": "Polygon",
                        "id": 39099,
                        "arcs": [[-2675, 2898, 2899, 2900, -2762, -2668]]
                    }, {
                        "type": "Polygon",
                        "id": 42025,
                        "arcs": [[-2816, 2901, 2902, 2903, -2712]]
                    }, {
                        "type": "Polygon",
                        "id": 42073,
                        "arcs": [[-2855, 2904, 2905, -2899, -2674]]
                    }, {
                        "type": "Polygon",
                        "id": 17105,
                        "arcs": [[-2778, 2906, 2907, 2908, -2571, -2688]]
                    }, {
                        "type": "Polygon",
                        "id": 34041,
                        "arcs": [[2909, 2910, 2911, 2912, -2814, -2756]]
                    }, {
                        "type": "Polygon",
                        "id": 34027,
                        "arcs": [[2913, 2914, 2915, 2916, -2910, -2755, -2827]]
                    }, {
                        "type": "Polygon",
                        "id": 49045,
                        "arcs": [[2917, 2918, 2919, 2920, -2362, -2356, -2888]]
                    }, {
                        "type": "Polygon",
                        "id": 19057,
                        "arcs": [[-2767, 2921, 2922, 2923, -2868, -2719]]
                    }, {
                        "type": "Polygon",
                        "id": 17071,
                        "arcs": [[2924, 2925, 2926, 2927, -2922, -2766]]
                    }, {
                        "type": "Polygon",
                        "id": 17187,
                        "arcs": [[-2891, 2928, 2929, -2925, -2765]]
                    }, {
                        "type": "Polygon",
                        "id": 39005,
                        "arcs": [[-2793, 2930, 2931, 2932, 2933, -2784, -2635]]
                    }, {
                        "type": "Polygon",
                        "id": 31025,
                        "arcs": [[-2881, 2934, 2935, 2936, -2695, -2830]]
                    }, {
                        "type": "Polygon",
                        "id": 31185,
                        "arcs": [[2937, 2938, 2939, -2846, -2729]]
                    }, {
                        "type": "Polygon",
                        "id": 31079,
                        "arcs": [[-2735, -2849, 2940, 2941, -2737]]
                    }, {
                        "type": "Polygon",
                        "id": 31047,
                        "arcs": [[2942, 2943, 2944, 2945, -2724, -2496]]
                    }, {
                        "type": "Polygon",
                        "id": 31019,
                        "arcs": [[-2738, -2942, 2946, 2947, 2948, -2943, -2495, -2740]]
                    }, {
                        "type": "Polygon",
                        "id": 31159,
                        "arcs": [[2949, 2950, -2938, -2691]]
                    }, {
                        "type": "Polygon",
                        "id": 31109,
                        "arcs": [[-2937, 2951, 2952, 2953, -2950, -2690, -2696]]
                    }, {
                        "type": "Polygon",
                        "id": 18169,
                        "arcs": [[-2781, 2954, 2955, 2956, -2842, -2698]]
                    }, {
                        "type": "Polygon",
                        "id": 17075,
                        "arcs": [[-2825, 2957, 2958, 2959, -2776]]
                    }, {
                        "type": "Polygon",
                        "id": 18069,
                        "arcs": [[-2798, 2960, 2961, -2955, -2780]]
                    }, {
                        "type": "Polygon",
                        "id": 8123,
                        "arcs": [[2962, 2963, 2964, 2965, 2966, -2552, -2733, 2967]]
                    }, {
                        "type": "Polygon",
                        "id": 31135,
                        "arcs": [[-2727, 2968, 2969, 2970, 2971, -2822, -2722]]
                    }, {
                        "type": "Polygon",
                        "id": 8107,
                        "arcs": [[2972, 2973, 2974, 2975, 2976, -2136, 2977]]
                    }, {
                        "type": "Polygon",
                        "id": 8057,
                        "arcs": [[2978, -2978, -2135, -2141, 2979]]
                    }, {
                        "type": "Polygon",
                        "id": 8081,
                        "arcs": [[-2977, 2980, 2981, 2982, -2194, -2137]]
                    }, {
                        "type": "Polygon",
                        "id": 8075,
                        "arcs": [[2983, 2984, 2985, -2968, -2732, -2702, 2986, 2987]]
                    }, {
                        "type": "Polygon",
                        "id": 8115,
                        "arcs": [[2988, -2987, -2701, -2823, -2972]]
                    }, {
                        "type": "Polygon",
                        "id": 49009,
                        "arcs": [[2989, 2990, -2806, -2195, -2983]]
                    }, {
                        "type": "Polygon",
                        "id": 32011,
                        "arcs": [[2991, 2992, 2993, -2364]]
                    }, {
                        "type": "Polygon",
                        "id": 32015,
                        "arcs": [[-2994, 2994, 2995, 2996, -2358, -2365]]
                    }, {
                        "type": "Polygon",
                        "id": 8069,
                        "arcs": [[2997, 2998, -2980, -2140, -2553, -2967]]
                    }, {
                        "type": "Polygon",
                        "id": 18103,
                        "arcs": [[-2957, 2999, 3000, 3001, -2843]]
                    }, {
                        "type": "Polygon",
                        "id": 39033,
                        "arcs": [[3002, 3003, 3004, 3005, -2799, -2786]]
                    }, {
                        "type": "Polygon",
                        "id": 17053,
                        "arcs": [[3006, 3007, 3008, -2907, -2777, -2960]]
                    }, {
                        "type": "Polygon",
                        "id": 39139,
                        "arcs": [[-2934, 3009, 3010, -3003, -2785]]
                    }, {
                        "type": "Polygon",
                        "id": 39175,
                        "arcs": [[-3006, 3011, 3012, -2859, -2800]]
                    }, {
                        "type": "Polygon",
                        "id": 39169,
                        "arcs": [[-2760, 3013, 3014, -2931, -2792]]
                    }, {
                        "type": "Polygon",
                        "id": 39161,
                        "arcs": [[-2864, 3015, 3016, 3017, 3018, -2795, -2818]]
                    }, {
                        "type": "Polygon",
                        "id": 39151,
                        "arcs": [[-2901, 3019, 3020, 3021, 3022, -3014, -2759, -2763]]
                    }, {
                        "type": "Polygon",
                        "id": 17143,
                        "arcs": [[-2895, 3023, 3024, 3025, -2889, -2820]]
                    }, {
                        "type": "Polygon",
                        "id": 42095,
                        "arcs": [[3026, 3027, -2902, -2815, -2913]]
                    }, {
                        "type": "Polygon",
                        "id": 32027,
                        "arcs": [[-2997, 3028, -2387, -2359]]
                    }, {
                        "type": "Polygon",
                        "id": 42107,
                        "arcs": [[-2904, 3029, 3030, 3031, 3032, -2837, -2772, -2713]]
                    }, {
                        "type": "Polygon",
                        "id": 39029,
                        "arcs": [[-2906, 3033, 3034, 3035, 3036, -3020, -2900]]
                    }, {
                        "type": "Polygon",
                        "id": 17203,
                        "arcs": [[3037, 3038, -3024, -2894, -2572, -2909]]
                    }, {
                        "type": "Polygon",
                        "id": 18001,
                        "arcs": [[3039, 3040, 3041, -2796, -3019]]
                    }, {
                        "type": "Polygon",
                        "id": 39003,
                        "arcs": [[-2861, 3042, 3043, -3016, -2863]]
                    }, {
                        "type": "Polygon",
                        "id": 49035,
                        "arcs": [[-2743, -2809, 3044, 3045, -2918, -2887]]
                    }, {
                        "type": "Polygon",
                        "id": 36005,
                        "arcs": [[3046, 3047, 3048, -2751]]
                    }, {
                        "type": "Polygon",
                        "id": 18179,
                        "arcs": [[-3042, 3049, 3050, 3051, -2961, -2797]]
                    }, {
                        "type": "Polygon",
                        "id": 36059,
                        "arcs": [[-2782, 3052, 3053, 3054, 3055, 3056]]
                    }, {
                        "type": "Polygon",
                        "id": 18181,
                        "arcs": [[3057, 3058, 3059, 3060, -2789, -2851]]
                    }, {
                        "type": "Polygon",
                        "id": 18017,
                        "arcs": [[-2844, -3002, 3061, 3062, -3058, -2850]]
                    }, {
                        "type": "Polygon",
                        "id": 42063,
                        "arcs": [[-2805, 3063, 3064, -2856, -2746]]
                    }, {
                        "type": "Polygon",
                        "id": 34013,
                        "arcs": [[-2826, -2897, 3065, 3066, 3067, -2914]]
                    }, {
                        "type": "Polygon",
                        "id": 19071,
                        "arcs": [[3068, 3069, 3070, -2935, -2880]]
                    }, {
                        "type": "Polygon",
                        "id": 19145,
                        "arcs": [[3071, 3072, 3073, -3069, -2883]]
                    }, {
                        "type": "Polygon",
                        "id": 19173,
                        "arcs": [[3074, 3075, 3076, -3072, -2885]]
                    }, {
                        "type": "Polygon",
                        "id": 19177,
                        "arcs": [[-2870, 3077, 3078, 3079, 3080, -2866]]
                    }, {
                        "type": "Polygon",
                        "id": 19051,
                        "arcs": [[-3081, 3081, 3082, 3083, -2871]]
                    }, {
                        "type": "Polygon",
                        "id": 19159,
                        "arcs": [[3084, 3085, 3086, -3075, -2886]]
                    }, {
                        "type": "Polygon",
                        "id": 19053,
                        "arcs": [[3087, 3088, 3089, -3085, -2874]]
                    }, {
                        "type": "Polygon",
                        "id": 19185,
                        "arcs": [[3090, 3091, 3092, -3088, -2877]]
                    }, {
                        "type": "Polygon",
                        "id": 19007,
                        "arcs": [[-3084, 3093, 3094, -3091, -2878]]
                    }, {
                        "type": "Polygon",
                        "id": 42109,
                        "arcs": [[-2840, 3095, 3096, -2892]]
                    }, {
                        "type": "Polygon",
                        "id": 36061,
                        "arcs": [[3097, -3048]]
                    }, {
                        "type": "Polygon",
                        "id": 49047,
                        "arcs": [[-2982, 3098, 3099, 3100, 3101, 3102, 3103, -2990]]
                    }, {
                        "type": "Polygon",
                        "id": 42007,
                        "arcs": [[-2854, 3104, 3105, 3106, -3034, -2905]]
                    }, {
                        "type": "Polygon",
                        "id": 42087,
                        "arcs": [[3107, -2811, -2893, -3097, 3108]]
                    }, {
                        "type": "Polygon",
                        "id": 49013,
                        "arcs": [[-2991, -3104, 3109, 3110, 3111, -2807]]
                    }, {
                        "type": "Polygon",
                        "id": 39065,
                        "arcs": [[-3013, 3112, 3113, 3114, 3115, -3043, -2860]]
                    }, {
                        "type": "Polygon",
                        "id": 34017,
                        "arcs": [[3116, -3066, -2896]]
                    }, {
                        "type": "Polygon",
                        "id": 19111,
                        "arcs": [[-2924, -2923, -2928, 3117, 3118, -3078, -2869]]
                    }, {
                        "type": "Polygon",
                        "id": 36081,
                        "arcs": [[-3056, 3119, 3120, 3121]]
                    }, {
                        "type": "Polygon",
                        "id": 34019,
                        "arcs": [[3122, 3123, 3124, -2911, -2917]]
                    }, {
                        "type": "Polygon",
                        "id": 42077,
                        "arcs": [[3125, 3126, 3127, -3030, -2903, -3028]]
                    }, {
                        "type": "Polygon",
                        "id": 31131,
                        "arcs": [[-3071, 3128, 3129, 3130, -2952, -2936]]
                    }, {
                        "type": "Polygon",
                        "id": 34035,
                        "arcs": [[3131, 3132, 3133, -3123, -2916]]
                    }, {
                        "type": "Polygon",
                        "id": 17113,
                        "arcs": [[-3009, 3134, 3135, 3136, 3137, 3138, -3038, -2908]]
                    }, {
                        "type": "Polygon",
                        "id": 8095,
                        "arcs": [[-2971, 3139, 3140, -2988, -2989]]
                    }, {
                        "type": "Polygon",
                        "id": 17179,
                        "arcs": [[-3139, 3141, 3142, 3143, -3025, -3039]]
                    }, {
                        "type": "Polygon",
                        "id": 42061,
                        "arcs": [[-3108, 3144, 3145, 3146, 3147, 3148, 3149, -2812]]
                    }, {
                        "type": "Polygon",
                        "id": 42013,
                        "arcs": [[-3149, 3150, 3151, -2803, -2813, -3150]]
                    }, {
                        "type": "Polygon",
                        "id": 36047,
                        "arcs": [[3152, -3121]]
                    }, {
                        "type": "Polygon",
                        "id": 18007,
                        "arcs": [[-2790, -3061, 3153, 3154, 3155, -2958, -2824]]
                    }, {
                        "type": "Polygon",
                        "id": 34039,
                        "arcs": [[3156, 3157, -3132, -2915, -3068]]
                    }, {
                        "type": "Polygon",
                        "id": 18015,
                        "arcs": [[-3063, 3158, 3159, 3160, -3059]]
                    }, {
                        "type": "Polygon",
                        "id": 39019,
                        "arcs": [[-3037, 3161, 3162, 3163, -3021]]
                    }, {
                        "type": "Polygon",
                        "id": 39107,
                        "arcs": [[3164, 3165, 3166, 3167, -3040, -3018]]
                    }, {
                        "type": "Polygon",
                        "id": 42021,
                        "arcs": [[-3152, 3168, 3169, 3170, -3064, -2804]]
                    }, {
                        "type": "Polygon",
                        "id": 17057,
                        "arcs": [[-3026, -3144, 3171, 3172, 3173, -2929, -2890]]
                    }, {
                        "type": "Polygon",
                        "id": 39117,
                        "arcs": [[-3011, 3174, 3175, 3176, -3004]]
                    }, {
                        "type": "Polygon",
                        "id": 39101,
                        "arcs": [[-3177, 3177, 3178, -3113, -3012, -3005]]
                    }, {
                        "type": "Polygon",
                        "id": 31063,
                        "arcs": [[-2946, 3179, 3180, 3181, 3182, 3183, -2725]]
                    }, {
                        "type": "Polygon",
                        "id": 31001,
                        "arcs": [[-2848, 3184, 3185, 3186, -2947, -2941]]
                    }, {
                        "type": "Polygon",
                        "id": 31073,
                        "arcs": [[3187, 3188, -3180, -2945]]
                    }, {
                        "type": "Polygon",
                        "id": 31085,
                        "arcs": [[-3184, 3189, 3190, 3191, -2969, -2726]]
                    }, {
                        "type": "Polygon",
                        "id": 31029,
                        "arcs": [[-3192, 3192, 3193, -3140, -2970]]
                    }, {
                        "type": "Polygon",
                        "id": 31059,
                        "arcs": [[3194, 3195, 3196, 3197, -2939]]
                    }, {
                        "type": "Polygon",
                        "id": 31151,
                        "arcs": [[-2951, -2954, 3198, 3199, -3195]]
                    }, {
                        "type": "Polygon",
                        "id": 31035,
                        "arcs": [[-3198, 3200, 3201, -3185, -2847, -2940]]
                    }, {
                        "type": "Polygon",
                        "id": 42067,
                        "arcs": [[-2839, 3202, 3203, -3145, -3109, -3096]]
                    }, {
                        "type": "Polygon",
                        "id": 49051,
                        "arcs": [[-3112, 3204, -3045, -2808]]
                    }, {
                        "type": "Polygon",
                        "id": 31099,
                        "arcs": [[3205, 3206, 3207, -2948, -3187]]
                    }, {
                        "type": "Polygon",
                        "id": 39011,
                        "arcs": [[-3116, 3208, 3209, -3165, -3017, -3044]]
                    }, {
                        "type": "Polygon",
                        "id": 31137,
                        "arcs": [[-2949, -3208, 3210, 3211, -3188, -2944]]
                    }, {
                        "type": "Polygon",
                        "id": 42129,
                        "arcs": [[-3065, -3171, 3212, 3213, 3214, 3215, -2857]]
                    }, {
                        "type": "Polygon",
                        "id": 42011,
                        "arcs": [[3216, 3217, 3218, 3219, -3031, -3128]]
                    }, {
                        "type": "Polygon",
                        "id": 42003,
                        "arcs": [[-2858, -3216, 3220, -3105, -2853]]
                    }, {
                        "type": "Polygon",
                        "id": 39075,
                        "arcs": [[-3023, 3221, 3222, 3223, -2932, -3015]]
                    }, {
                        "type": "Polygon",
                        "id": 39157,
                        "arcs": [[-3164, 3224, 3225, 3226, -3222, -3022]]
                    }, {
                        "type": "Polygon",
                        "id": 42043,
                        "arcs": [[-3033, 3227, 3228, 3229, 3230, 3231, -2838]]
                    }, {
                        "type": "Polygon",
                        "id": 18053,
                        "arcs": [[-3052, 3232, 3233, 3234, 3235, 3236, -3000, -2956, -2962]]
                    }, {
                        "type": "Polygon",
                        "id": 36085,
                        "arcs": [[3237]]
                    }, {
                        "type": "Polygon",
                        "id": 17067,
                        "arcs": [[3238, 3239, 3240, 3241, 3242, -3118, -2927]]
                    }, {
                        "type": "Polygon",
                        "id": 54029,
                        "arcs": [[3243, 3244, 3245, -3035, -3107]]
                    }, {
                        "type": "Polygon",
                        "id": 17109,
                        "arcs": [[-3174, 3246, -3239, -2926, -2930]]
                    }, {
                        "type": "Polygon",
                        "id": 42099,
                        "arcs": [[3247, 3248, -3203, -3232]]
                    }, {
                        "type": "Polygon",
                        "id": 29045,
                        "arcs": [[-3243, 3249, 3250, 3251, -3079, -3119]]
                    }, {
                        "type": "Polygon",
                        "id": 42017,
                        "arcs": [[3252, 3253, 3254, 3255, -3126, -3027, -2912, -3125]]
                    }, {
                        "type": "Polygon",
                        "id": 34023,
                        "arcs": [[3256, 3257, 3258, -3133, -3158]]
                    }, {
                        "type": "Polygon",
                        "id": 29199,
                        "arcs": [[-3252, 3259, 3260, 3261, -3082, -3080]]
                    }, {
                        "type": "Polygon",
                        "id": 39081,
                        "arcs": [[-3246, 3262, 3263, 3264, 3265, -3162, -3036]]
                    }, {
                        "type": "Polygon",
                        "id": 29197,
                        "arcs": [[3266, 3267, -3094, -3083, -3262]]
                    }, {
                        "type": "Polygon",
                        "id": 29171,
                        "arcs": [[-3268, 3268, 3269, 3270, -3092, -3095]]
                    }, {
                        "type": "Polygon",
                        "id": 29005,
                        "arcs": [[-3074, 3271, 3272, 3273, -3129, -3070]]
                    }, {
                        "type": "Polygon",
                        "id": 29129,
                        "arcs": [[-3271, 3274, 3275, 3276, -3089, -3093]]
                    }, {
                        "type": "Polygon",
                        "id": 29147,
                        "arcs": [[-3077, 3277, 3278, 3279, 3280, -3272, -3073]]
                    }, {
                        "type": "Polygon",
                        "id": 49049,
                        "arcs": [[-3111, 3281, 3282, 3283, -2919, -3046, -3205]]
                    }, {
                        "type": "Polygon",
                        "id": 29081,
                        "arcs": [[-3277, 3284, 3285, 3286, 3287, -3086, -3090]]
                    }, {
                        "type": "Polygon",
                        "id": 39083,
                        "arcs": [[3288, 3289, 3290, -3175, -3010, -2933, -3224]]
                    }, {
                        "type": "Polygon",
                        "id": 18075,
                        "arcs": [[-3168, 3291, 3292, 3293, 3294, -3050, -3041]]
                    }, {
                        "type": "Polygon",
                        "id": 29227,
                        "arcs": [[-3288, 3295, -3278, -3076, -3087]]
                    }, {
                        "type": "Polygon",
                        "id": 18009,
                        "arcs": [[-3295, 3296, -3233, -3051]]
                    }, {
                        "type": "Polygon",
                        "id": 18067,
                        "arcs": [[3297, 3298, -3159, -3062, -3001, -3237]]
                    }, {
                        "type": "Polygon",
                        "id": 18157,
                        "arcs": [[-3161, 3299, 3300, 3301, 3302, -3154, -3060]]
                    }, {
                        "type": "Polygon",
                        "id": 31127,
                        "arcs": [[3303, 3304, 3305, 3306, -3130, -3274]]
                    }, {
                        "type": "Polygon",
                        "id": 42075,
                        "arcs": [[-3228, -3032, -3220, 3307]]
                    }, {
                        "type": "Polygon",
                        "id": 39091,
                        "arcs": [[-3115, 3308, 3309, 3310, -3209]]
                    }, {
                        "type": "Polygon",
                        "id": 8087,
                        "arcs": [[-2986, 3311, 3312, -2963]]
                    }, {
                        "type": "Polygon",
                        "id": 31067,
                        "arcs": [[3313, 3314, 3315, 3316, 3317, -3199, -2953]]
                    }, {
                        "type": "Polygon",
                        "id": 31097,
                        "arcs": [[-3307, 3318, -3314, -3131]]
                    }, {
                        "type": "Polygon",
                        "id": 39159,
                        "arcs": [[3319, 3320, 3321, -3309, -3114, -3179, 3322]]
                    }, {
                        "type": "Polygon",
                        "id": 17183,
                        "arcs": [[-3156, 3323, 3324, 3325, 3326, -3007, -2959]]
                    }, {
                        "type": "Polygon",
                        "id": 8049,
                        "arcs": [[3327, 3328, 3329, 3330, 3331, -2973, -2979, -2999]]
                    }, {
                        "type": "Polygon",
                        "id": 39149,
                        "arcs": [[-3311, 3332, 3333, 3334, -3166, -3210]]
                    }, {
                        "type": "Polygon",
                        "id": 42125,
                        "arcs": [[-3221, -3215, 3335, 3336, 3337, 3338, 3339, -3244, -3106]]
                    }, {
                        "type": "Polygon",
                        "id": 18171,
                        "arcs": [[-3303, 3340, 3341, -3324, -3155]]
                    }, {
                        "type": "Polygon",
                        "id": 34025,
                        "arcs": [[3342, 3343, 3344, 3345, -3258, 3346]]
                    }, {
                        "type": "Polygon",
                        "id": 39031,
                        "arcs": [[-3227, 3347, 3348, 3349, -3289, -3223]]
                    }, {
                        "type": "Polygon",
                        "id": 42091,
                        "arcs": [[3350, 3351, 3352, 3353, -3217, -3127, -3256]]
                    }, {
                        "type": "Polygon",
                        "id": 6103,
                        "arcs": [[3354, 3355, 3356, 3357, -2749, -2835]]
                    }, {
                        "type": "Polygon",
                        "id": 6063,
                        "arcs": [[-2832, 3358, 3359, 3360, -3355, -2834]]
                    }, {
                        "type": "Polygon",
                        "id": 39041,
                        "arcs": [[-3291, 3361, 3362, -3323, -3178, -3176]]
                    }, {
                        "type": "Polygon",
                        "id": 8125,
                        "arcs": [[-3194, 3363, 3364, 3365, 3366, -2984, -3141]]
                    }, {
                        "type": "Polygon",
                        "id": 8121,
                        "arcs": [[-3367, 3367, 3368, 3369, 3370, -3312, -2985]]
                    }, {
                        "type": "Polygon",
                        "id": 17125,
                        "arcs": [[3371, 3372, 3373, 3374, -3172, -3143]]
                    }, {
                        "type": "Polygon",
                        "id": 39067,
                        "arcs": [[-3266, 3375, 3376, -3225, -3163]]
                    }, {
                        "type": "Polygon",
                        "id": 18023,
                        "arcs": [[-3299, 3377, 3378, 3379, 3380, -3300, -3160]]
                    }, {
                        "type": "Polygon",
                        "id": 34021,
                        "arcs": [[-3259, -3346, 3381, -3253, -3124, -3134]]
                    }, {
                        "type": "Polygon",
                        "id": 18159,
                        "arcs": [[-3236, 3382, 3383, -3378, -3298]]
                    }, {
                        "type": "Polygon",
                        "id": 54009,
                        "arcs": [[-3340, 3384, -3263, -3245]]
                    }, {
                        "type": "Polygon",
                        "id": 17019,
                        "arcs": [[-3327, 3385, 3386, -3135, -3008]]
                    }, {
                        "type": "Polygon",
                        "id": 29211,
                        "arcs": [[3387, 3388, 3389, -3275, -3270]]
                    }, {
                        "type": "Polygon",
                        "id": 29075,
                        "arcs": [[-3287, 3390, 3391, 3392, -3279, -3296]]
                    }, {
                        "type": "Polygon",
                        "id": 18095,
                        "arcs": [[3393, 3394, 3395, 3396, -3383, -3235]]
                    }, {
                        "type": "Polygon",
                        "id": 18035,
                        "arcs": [[-3297, -3294, 3397, 3398, -3394, -3234]]
                    }, {
                        "type": "Polygon",
                        "id": 18045,
                        "arcs": [[-3302, 3399, 3400, 3401, -3341]]
                    }, {
                        "type": "Polygon",
                        "id": 39037,
                        "arcs": [[-3335, 3402, 3403, 3404, 3405, 3406, -3292, -3167]]
                    }, {
                        "type": "Polygon",
                        "id": 31181,
                        "arcs": [[-3202, 3407, 3408, 3409, 3410, -3206, -3186]]
                    }, {
                        "type": "Polygon",
                        "id": 31061,
                        "arcs": [[-3411, 3411, 3412, 3413, -3207]]
                    }, {
                        "type": "Polygon",
                        "id": 31129,
                        "arcs": [[-3197, 3414, 3415, 3416, -3408, -3201]]
                    }, {
                        "type": "Polygon",
                        "id": 31057,
                        "arcs": [[3417, 3418, 3419, -3364, -3193, -3191]]
                    }, {
                        "type": "Polygon",
                        "id": 31065,
                        "arcs": [[-3212, 3420, 3421, 3422, 3423, -3181, -3189]]
                    }, {
                        "type": "Polygon",
                        "id": 31169,
                        "arcs": [[3424, 3425, -3415, -3196]]
                    }, {
                        "type": "Polygon",
                        "id": 31095,
                        "arcs": [[-3200, -3318, 3426, -3425]]
                    }, {
                        "type": "Polygon",
                        "id": 31145,
                        "arcs": [[-3424, 3427, 3428, 3429, -3182]]
                    }, {
                        "type": "Polygon",
                        "id": 31087,
                        "arcs": [[-3183, -3430, 3430, -3418, -3190]]
                    }, {
                        "type": "Polygon",
                        "id": 31083,
                        "arcs": [[-3414, 3431, 3432, -3421, -3211]]
                    }, {
                        "type": "Polygon",
                        "id": 29001,
                        "arcs": [[-3261, 3433, 3434, 3435, -3388, -3269, -3267]]
                    }, {
                        "type": "Polygon",
                        "id": 42041,
                        "arcs": [[3436, 3437, 3438, -3248, -3231]]
                    }, {
                        "type": "Polygon",
                        "id": 17107,
                        "arcs": [[3439, 3440, 3441, 3442, -3372, -3142, -3138]]
                    }, {
                        "type": "Polygon",
                        "id": 42009,
                        "arcs": [[-3148, 3443, 3444, 3445, -3169, -3151]]
                    }, {
                        "type": "Polygon",
                        "id": 42071,
                        "arcs": [[3446, 3447, 3448, 3449, -3229, -3308, -3219]]
                    }, {
                        "type": "Polygon",
                        "id": 18135,
                        "arcs": [[-3407, 3450, 3451, -3398, -3293]]
                    }, {
                        "type": "Polygon",
                        "id": 29103,
                        "arcs": [[-3251, 3452, 3453, 3454, -3434, -3260]]
                    }, {
                        "type": "Polygon",
                        "id": 42055,
                        "arcs": [[-3439, 3455, 3456, 3457, 3458, -3146, -3204, -3249]]
                    }, {
                        "type": "Polygon",
                        "id": 42111,
                        "arcs": [[-3446, 3459, 3460, 3461, -3213, -3170]]
                    }, {
                        "type": "Polygon",
                        "id": 17039,
                        "arcs": [[3462, 3463, -3440, -3137]]
                    }, {
                        "type": "Polygon",
                        "id": 17169,
                        "arcs": [[-3173, -3375, 3464, 3465, 3466, -3240, -3247]]
                    }, {
                        "type": "Polygon",
                        "id": 17147,
                        "arcs": [[-3387, 3467, 3468, 3469, -3463, -3136]]
                    }, {
                        "type": "Polygon",
                        "id": 39089,
                        "arcs": [[-3350, 3470, 3471, 3472, 3473, -3362, -3290]]
                    }, {
                        "type": "Polygon",
                        "id": 39021,
                        "arcs": [[-3322, 3474, 3475, 3476, -3333, -3310]]
                    }, {
                        "type": "Polygon",
                        "id": 29079,
                        "arcs": [[-3390, 3477, 3478, 3479, -3285, -3276]]
                    }, {
                        "type": "Polygon",
                        "id": 8013,
                        "arcs": [[-2966, 3480, 3481, 3482, -3328, -2998]]
                    }, {
                        "type": "Polygon",
                        "id": 31133,
                        "arcs": [[-3306, 3483, 3484, 3485, -3315, -3319]]
                    }, {
                        "type": "Polygon",
                        "id": 31147,
                        "arcs": [[3486, 3487, 3488, 3489, -3484, -3305]]
                    }, {
                        "type": "Polygon",
                        "id": 29087,
                        "arcs": [[-3281, 3490, 3491, -3487, -3304, -3273]]
                    }, {
                        "type": "Polygon",
                        "id": 29111,
                        "arcs": [[-3242, 3492, 3493, 3494, -3453, -3250]]
                    }, {
                        "type": "Polygon",
                        "id": 42029,
                        "arcs": [[3495, 3496, 3497, -3447, -3218, -3354]]
                    }, {
                        "type": "Polygon",
                        "id": 42133,
                        "arcs": [[-3450, 3498, 3499, 3500, 3501, -3437, -3230]]
                    }, {
                        "type": "Polygon",
                        "id": 8103,
                        "arcs": [[3502, -3099, -2981, -2976]]
                    }, {
                        "type": "Polygon",
                        "id": 39059,
                        "arcs": [[3503, 3504, -3348, -3226, -3377, 3505]]
                    }, {
                        "type": "Polygon",
                        "id": 18057,
                        "arcs": [[3506, 3507, 3508, -3379, -3384, -3397]]
                    }, {
                        "type": "Polygon",
                        "id": 18107,
                        "arcs": [[-3381, 3509, 3510, 3511, 3512, -3400, -3301]]
                    }, {
                        "type": "Polygon",
                        "id": 17001,
                        "arcs": [[-3467, 3513, 3514, 3515, -3493, -3241]]
                    }, {
                        "type": "Polygon",
                        "id": 39109,
                        "arcs": [[-3477, 3516, 3517, -3403, -3334]]
                    }, {
                        "type": "Polygon",
                        "id": 54069,
                        "arcs": [[-3339, 3518, 3519, -3264, -3385]]
                    }, {
                        "type": "Polygon",
                        "id": 34005,
                        "arcs": [[-3345, 3520, 3521, 3522, 3523, 3524, 3525, -3254, -3382]]
                    }, {
                        "type": "Polygon",
                        "id": 18011,
                        "arcs": [[-3509, 3526, 3527, -3510, -3380]]
                    }, {
                        "type": "Polygon",
                        "id": 39013,
                        "arcs": [[-3265, -3520, 3528, 3529, 3530, -3506, -3376]]
                    }, {
                        "type": "Polygon",
                        "id": 34029,
                        "arcs": [[-3343, 3531, -3521, -3344]]
                    }, {
                        "type": "Polygon",
                        "id": 39119,
                        "arcs": [[-3505, 3532, 3533, 3534, -3471, -3349]]
                    }, {
                        "type": "Polygon",
                        "id": 42057,
                        "arcs": [[-3459, 3535, 3536, -3444, -3147]]
                    }, {
                        "type": "Polygon",
                        "id": 17129,
                        "arcs": [[-3443, 3537, 3538, -3373]]
                    }, {
                        "type": "Polygon",
                        "id": 6007,
                        "arcs": [[3539, 3540, 3541, 3542, -3356, -3361]]
                    }, {
                        "type": "Polygon",
                        "id": 18165,
                        "arcs": [[-3402, 3543, 3544, 3545, -3325, -3342]]
                    }, {
                        "type": "Polygon",
                        "id": 42051,
                        "arcs": [[-3462, 3546, 3547, 3548, 3549, -3336, -3214]]
                    }, {
                        "type": "Polygon",
                        "id": 39049,
                        "arcs": [[-3474, 3550, 3551, 3552, -3320, -3363]]
                    }, {
                        "type": "Polygon",
                        "id": 42101,
                        "arcs": [[-3526, 3553, 3554, -3352, -3351, -3255]]
                    }, {
                        "type": "Polygon",
                        "id": 29061,
                        "arcs": [[-3286, -3480, 3555, 3556, 3557, -3391]]
                    }, {
                        "type": "Polygon",
                        "id": 29003,
                        "arcs": [[-3393, 3558, 3559, 3560, -3491, -3280]]
                    }, {
                        "type": "Polygon",
                        "id": 32033,
                        "arcs": [[-2921, 3561, 3562, 3563, 3564, -2992, -2363]]
                    }, {
                        "type": "Polygon",
                        "id": 17017,
                        "arcs": [[-3374, -3539, 3565, 3566, 3567, -3465]]
                    }, {
                        "type": "Polygon",
                        "id": 39097,
                        "arcs": [[3568, 3569, 3570, 3571, -3475, -3321, -3553]]
                    }, {
                        "type": "Polygon",
                        "id": 17009,
                        "arcs": [[-3568, 3572, 3573, -3514, -3466]]
                    }, {
                        "type": "Polygon",
                        "id": 8045,
                        "arcs": [[-2975, 3574, 3575, 3576, 3577, -3100, -3503]]
                    }, {
                        "type": "Polygon",
                        "id": 18065,
                        "arcs": [[-3452, 3578, 3579, 3580, 3581, -3395, -3399]]
                    }, {
                        "type": "Polygon",
                        "id": 42001,
                        "arcs": [[3582, 3583, -3456, -3438, -3502]]
                    }, {
                        "type": "Polygon",
                        "id": 42045,
                        "arcs": [[-3555, 3584, 3585, 3586, 3587, -3496, -3353]]
                    }, {
                        "type": "Polygon",
                        "id": 17115,
                        "arcs": [[-3470, 3588, 3589, 3590, 3591, -3441, -3464]]
                    }, {
                        "type": "Polygon",
                        "id": 8014,
                        "arcs": [[3592, 3593, 3594, -3481, -2965]]
                    }, {
                        "type": "Polygon",
                        "id": 29121,
                        "arcs": [[-3455, 3595, 3596, 3597, 3598, 3599, -3435]]
                    }, {
                        "type": "Polygon",
                        "id": 39023,
                        "arcs": [[-3572, 3600, 3601, -3517, -3476]]
                    }, {
                        "type": "Polygon",
                        "id": 29115,
                        "arcs": [[-3600, 3602, 3603, -3478, -3389, -3436]]
                    }, {
                        "type": "Polygon",
                        "id": 29063,
                        "arcs": [[-3558, 3604, 3605, 3606, -3559, -3392]]
                    }, {
                        "type": "Polygon",
                        "id": 54051,
                        "arcs": [[3607, 3608, -3529, -3519, -3338, 3609]]
                    }, {
                        "type": "Polygon",
                        "id": 42059,
                        "arcs": [[-3550, 3610, 3611, -3610, -3337]]
                    }, {
                        "type": "Polygon",
                        "id": 49023,
                        "arcs": [[-3284, 3612, 3613, -3562, -2920]]
                    }, {
                        "type": "Polygon",
                        "id": 18177,
                        "arcs": [[-3406, 3614, 3615, 3616, -3579, -3451]]
                    }, {
                        "type": "Polygon",
                        "id": 20023,
                        "arcs": [[3617, 3618, 3619, -3365, -3420]]
                    }, {
                        "type": "Polygon",
                        "id": 20153,
                        "arcs": [[-3429, 3620, 3621, 3622, -3618, -3419, -3431]]
                    }, {
                        "type": "Polygon",
                        "id": 6045,
                        "arcs": [[-2750, -3358, 3623, 3624, 3625, 3626, -2685]]
                    }, {
                        "type": "Polygon",
                        "id": 20089,
                        "arcs": [[3627, 3628, 3629, 3630, 3631, -3409, -3417]]
                    }, {
                        "type": "Polygon",
                        "id": 20183,
                        "arcs": [[-3632, 3632, 3633, 3634, -3412, -3410]]
                    }, {
                        "type": "Polygon",
                        "id": 20157,
                        "arcs": [[3635, 3636, -3628, -3416, -3426]]
                    }, {
                        "type": "Polygon",
                        "id": 20201,
                        "arcs": [[-3317, 3637, 3638, 3639, 3640, -3636, -3427]]
                    }, {
                        "type": "Polygon",
                        "id": 20039,
                        "arcs": [[-3423, 3641, 3642, 3643, -3621, -3428]]
                    }, {
                        "type": "Polygon",
                        "id": 32001,
                        "arcs": [[-2996, 3644, 3645, 3646, -2388, -3029]]
                    }, {
                        "type": "Polygon",
                        "id": 20137,
                        "arcs": [[3647, 3648, 3649, -3642, -3422, -3433]]
                    }, {
                        "type": "Polygon",
                        "id": 20147,
                        "arcs": [[-3635, 3650, 3651, -3648, -3432, -3413]]
                    }, {
                        "type": "Polygon",
                        "id": 20117,
                        "arcs": [[-3486, 3652, 3653, 3654, -3638, -3316]]
                    }, {
                        "type": "Polygon",
                        "id": 8001,
                        "arcs": [[-3371, 3655, 3656, 3657, -3594, -3593, -2964, -3313]]
                    }, {
                        "type": "Polygon",
                        "id": 20013,
                        "arcs": [[3658, 3659, 3660, 3661, -3489]]
                    }, {
                        "type": "Polygon",
                        "id": 20131,
                        "arcs": [[-3490, -3662, 3662, 3663, -3653, -3485]]
                    }, {
                        "type": "Polygon",
                        "id": 20043,
                        "arcs": [[-3492, -3561, 3664, 3665, -3659, -3488]]
                    }, {
                        "type": "Polygon",
                        "id": 34007,
                        "arcs": [[3666, 3667, 3668, -3524]]
                    }, {
                        "type": "Polygon",
                        "id": 17167,
                        "arcs": [[-3592, 3669, 3670, 3671, 3672, -3566, -3538, -3442]]
                    }, {
                        "type": "Polygon",
                        "id": 29117,
                        "arcs": [[3673, 3674, 3675, -3556, -3479, -3604]]
                    }, {
                        "type": "Polygon",
                        "id": 29205,
                        "arcs": [[-3495, 3676, 3677, -3596, -3454]]
                    }, {
                        "type": "Polygon",
                        "id": 18121,
                        "arcs": [[-3513, 3678, 3679, 3680, -3544, -3401]]
                    }, {
                        "type": "Polygon",
                        "id": 39121,
                        "arcs": [[-3531, 3681, 3682, 3683, -3533, -3504]]
                    }, {
                        "type": "Polygon",
                        "id": 29127,
                        "arcs": [[-3516, 3684, 3685, 3686, -3677, -3494]]
                    }, {
                        "type": "Polygon",
                        "id": 18059,
                        "arcs": [[-3582, 3687, 3688, 3689, -3507, -3396]]
                    }, {
                        "type": "Polygon",
                        "id": 39045,
                        "arcs": [[-3473, 3690, 3691, 3692, -3551]]
                    }, {
                        "type": "Polygon",
                        "id": 8047,
                        "arcs": [[3693, 3694, -3329, -3483]]
                    }, {
                        "type": "Polygon",
                        "id": 39127,
                        "arcs": [[3695, 3696, 3697, -3691, -3472, -3535]]
                    }, {
                        "type": "Polygon",
                        "id": 18097,
                        "arcs": [[-3690, 3698, 3699, 3700, 3701, -3527, -3508]]
                    }, {
                        "type": "Polygon",
                        "id": 8037,
                        "arcs": [[3702, 3703, 3704, -3575, -2974, -3332]]
                    }, {
                        "type": "Polygon",
                        "id": 8117,
                        "arcs": [[3705, 3706, 3707, -3703, -3331]]
                    }, {
                        "type": "Polygon",
                        "id": 18063,
                        "arcs": [[-3702, 3708, 3709, -3511, -3528]]
                    }, {
                        "type": "Polygon",
                        "id": 39113,
                        "arcs": [[-3602, 3710, 3711, 3712, 3713, -3404, -3518]]
                    }, {
                        "type": "Polygon",
                        "id": 39135,
                        "arcs": [[-3714, 3714, 3715, -3615, -3405]]
                    }, {
                        "type": "Polygon",
                        "id": 8059,
                        "arcs": [[-3658, 3716, 3717, 3718, 3719, 3720, 3721, -3694, -3482, -3595]]
                    }, {
                        "type": "Polygon",
                        "id": 8031,
                        "arcs": [[3722, -3717, -3657]]
                    }, {
                        "type": "Polygon",
                        "id": 34015,
                        "arcs": [[3723, 3724, 3725, 3726, -3668]]
                    }, {
                        "type": "Polygon",
                        "id": 17045,
                        "arcs": [[3727, 3728, 3729, 3730, -3326, -3546]]
                    }, {
                        "type": "Polygon",
                        "id": 17041,
                        "arcs": [[-3731, 3731, 3732, -3468, -3386]]
                    }, {
                        "type": "Polygon",
                        "id": 17137,
                        "arcs": [[-3673, 3733, 3734, 3735, 3736, -3573, -3567]]
                    }, {
                        "type": "Polygon",
                        "id": 39111,
                        "arcs": [[-3609, 3737, 3738, 3739, -3682, -3530]]
                    }, {
                        "type": "Polygon",
                        "id": 18133,
                        "arcs": [[-3710, 3740, 3741, 3742, -3679, -3512]]
                    }, {
                        "type": "Polygon",
                        "id": 8019,
                        "arcs": [[-3722, 3743, -3706, -3330, -3695]]
                    }, {
                        "type": "Polygon",
                        "id": 39057,
                        "arcs": [[-3571, 3744, 3745, 3746, -3711, -3601]]
                    }, {
                        "type": "Polygon",
                        "id": 17149,
                        "arcs": [[-3737, 3747, 3748, 3749, 3750, 3751, -3685, -3515, -3574]]
                    }, {
                        "type": "Polygon",
                        "id": 10003,
                        "arcs": [[3752, 3753, 3754, 3755, -3497, -3588, 3756, -3586]]
                    }, {
                        "type": "Polygon",
                        "id": 17021,
                        "arcs": [[-3591, 3757, 3758, -3670]]
                    }, {
                        "type": "Polygon",
                        "id": 29021,
                        "arcs": [[-3607, 3759, 3760, 3761, -3665, -3560]]
                    }, {
                        "type": "Polygon",
                        "id": 49007,
                        "arcs": [[-3110, -3103, 3762, 3763, -3282]]
                    }, {
                        "type": "Polygon",
                        "id": 49039,
                        "arcs": [[-3764, 3764, 3765, 3766, -3613, -3283]]
                    }, {
                        "type": "Polygon",
                        "id": 39129,
                        "arcs": [[-3693, 3767, 3768, 3769, -3569, -3552]]
                    }, {
                        "type": "Polygon",
                        "id": 6021,
                        "arcs": [[-3543, 3770, 3771, -3624, -3357]]
                    }, {
                        "type": "Polygon",
                        "id": 17139,
                        "arcs": [[-3733, 3772, 3773, -3589, -3469]]
                    }, {
                        "type": "Polygon",
                        "id": 18041,
                        "arcs": [[3774, 3775, 3776, -3580, -3617]]
                    }, {
                        "type": "Polygon",
                        "id": 18139,
                        "arcs": [[-3777, 3777, 3778, 3779, -3688, -3581]]
                    }, {
                        "type": "Polygon",
                        "id": 17171,
                        "arcs": [[3780, -3748, -3736]]
                    }, {
                        "type": "Polygon",
                        "id": 29025,
                        "arcs": [[-3676, 3781, 3782, 3783, -3605, -3557]]
                    }, {
                        "type": "Polygon",
                        "id": 34033,
                        "arcs": [[3784, 3785, 3786, 3787, 3788, 3789, -3726]]
                    }, {
                        "type": "Polygon",
                        "id": 6091,
                        "arcs": [[-2831, -2394, 3790, 3791, -3359]]
                    }, {
                        "type": "Polygon",
                        "id": 39115,
                        "arcs": [[-3684, 3792, 3793, -3696, -3534]]
                    }, {
                        "type": "Polygon",
                        "id": 29049,
                        "arcs": [[-3784, 3794, 3795, 3796, -3760, -3606]]
                    }, {
                        "type": "Polygon",
                        "id": 8005,
                        "arcs": [[-3370, 3797, 3798, 3799, -3718, -3723, -3656]]
                    }, {
                        "type": "Polygon",
                        "id": 32019,
                        "arcs": [[3800, 3801, 3802, 3803, 3804, -2389, -3647]]
                    }, {
                        "type": "Polygon",
                        "id": 34001,
                        "arcs": [[3805, 3806, 3807, -3724, -3667, -3523]]
                    }, {
                        "type": "Polygon",
                        "id": 18161,
                        "arcs": [[-3716, 3808, 3809, -3775, -3616]]
                    }, {
                        "type": "Polygon",
                        "id": 24043,
                        "arcs": [[-3458, 3810, 3811, 3812, 3813, 3814, 3815, -3536]]
                    }, {
                        "type": "Polygon",
                        "id": 24001,
                        "arcs": [[-3537, -3816, 3816, 3817, 3818, 3819, -3460, -3445]]
                    }, {
                        "type": "Polygon",
                        "id": 24023,
                        "arcs": [[-3820, 3820, 3821, 3822, -3547, -3461]]
                    }, {
                        "type": "Polygon",
                        "id": 24015,
                        "arcs": [[-3756, 3823, 3824, 3825, -3448, -3498]]
                    }, {
                        "type": "Polygon",
                        "id": 54061,
                        "arcs": [[-3549, 3826, 3827, 3828, 3829, -3611]]
                    }, {
                        "type": "Polygon",
                        "id": 54077,
                        "arcs": [[-3823, 3830, 3831, 3832, 3833, -3827, -3548]]
                    }, {
                        "type": "Polygon",
                        "id": 24025,
                        "arcs": [[-3449, -3826, 3834, 3835, -3499]]
                    }, {
                        "type": "Polygon",
                        "id": 54103,
                        "arcs": [[-3612, -3830, 3836, 3837, 3838, 3839, -3738, -3608]]
                    }, {
                        "type": "Polygon",
                        "id": 24005,
                        "arcs": [[-3836, 3840, 3841, 3842, 3843, 3844, -3500]]
                    }, {
                        "type": "Polygon",
                        "id": 24013,
                        "arcs": [[-3845, 3845, 3846, -3583, -3501]]
                    }, {
                        "type": "Polygon",
                        "id": 24021,
                        "arcs": [[-3847, 3847, 3848, 3849, -3811, -3457, -3584]]
                    }, {
                        "type": "Polygon",
                        "id": 39047,
                        "arcs": [[-3770, 3850, 3851, 3852, -3745, -3570]]
                    }, {
                        "type": "Polygon",
                        "id": 49015,
                        "arcs": [[-3102, 3853, 3854, 3855, -3765, -3763]]
                    }, {
                        "type": "Polygon",
                        "id": 29041,
                        "arcs": [[-3599, 3856, 3857, 3858, 3859, -3674, -3603]]
                    }, {
                        "type": "Polygon",
                        "id": 18145,
                        "arcs": [[-3780, 3860, 3861, 3862, -3699, -3689]]
                    }, {
                        "type": "Polygon",
                        "id": 54065,
                        "arcs": [[3863, 3864, 3865, -3817, -3815]]
                    }, {
                        "type": "Polygon",
                        "id": 29173,
                        "arcs": [[-3752, 3866, 3867, 3868, -3686]]
                    }, {
                        "type": "Polygon",
                        "id": 17029,
                        "arcs": [[-3730, 3869, 3870, 3871, -3773, -3732]]
                    }, {
                        "type": "Polygon",
                        "id": 29137,
                        "arcs": [[-3687, -3869, 3872, 3873, -3597, -3678]]
                    }, {
                        "type": "Polygon",
                        "id": 39073,
                        "arcs": [[3874, 3875, 3876, -3768, -3692, -3698]]
                    }, {
                        "type": "Polygon",
                        "id": 20029,
                        "arcs": [[-3641, 3877, 3878, 3879, -3629, -3637]]
                    }, {
                        "type": "Polygon",
                        "id": 20085,
                        "arcs": [[3880, 3881, 3882, 3883, -3663, -3661]]
                    }, {
                        "type": "Polygon",
                        "id": 20005,
                        "arcs": [[-3762, 3884, 3885, 3886, -3881, -3660, -3666]]
                    }, {
                        "type": "Polygon",
                        "id": 17173,
                        "arcs": [[-3774, -3872, 3887, 3888, 3889, 3890, -3758, -3590]]
                    }, {
                        "type": "Polygon",
                        "id": 54057,
                        "arcs": [[3891, 3892, -3821, -3819]]
                    }, {
                        "type": "Polygon",
                        "id": 39167,
                        "arcs": [[-3740, 3893, 3894, 3895, 3896, -3793, -3683]]
                    }, {
                        "type": "Polygon",
                        "id": 54049,
                        "arcs": [[-3829, 3897, 3898, -3837]]
                    }, {
                        "type": "Polygon",
                        "id": 18081,
                        "arcs": [[-3863, 3899, 3900, 3901, -3700]]
                    }, {
                        "type": "Polygon",
                        "id": 6115,
                        "arcs": [[-3792, 3902, 3903, 3904, -3540, -3360]]
                    }, {
                        "type": "Polygon",
                        "id": 18109,
                        "arcs": [[-3902, 3905, 3906, 3907, -3741, -3709, -3701]]
                    }, {
                        "type": "Polygon",
                        "id": 32029,
                        "arcs": [[-2390, -3805]]
                    }, {
                        "type": "Polygon",
                        "id": 54003,
                        "arcs": [[-3814, 3908, 3909, -3864]]
                    }, {
                        "type": "Polygon",
                        "id": 29033,
                        "arcs": [[-3860, 3910, 3911, 3912, -3782, -3675]]
                    }, {
                        "type": "Polygon",
                        "id": 29175,
                        "arcs": [[-3874, 3913, 3914, 3915, -3857, -3598]]
                    }, {
                        "type": "Polygon",
                        "id": 18167,
                        "arcs": [[3916, 3917, 3918, -3728, -3545, -3681]]
                    }, {
                        "type": "Polygon",
                        "id": 18021,
                        "arcs": [[-3743, 3919, 3920, 3921, -3917, -3680]]
                    }, {
                        "type": "Polygon",
                        "id": 54095,
                        "arcs": [[3922, 3923, 3924, -3894, -3739, -3840]]
                    }, {
                        "type": "Polygon",
                        "id": 29163,
                        "arcs": [[3925, 3926, 3927, -3867, -3751, 3928]]
                    }, {
                        "type": "Polygon",
                        "id": 39017,
                        "arcs": [[3929, 3930, 3931, -3809, -3715, -3713]]
                    }, {
                        "type": "Polygon",
                        "id": 39165,
                        "arcs": [[-3747, 3932, 3933, 3934, -3930, -3712]]
                    }, {
                        "type": "Polygon",
                        "id": 6033,
                        "arcs": [[3935, 3936, 3937, 3938, -3625, -3772]]
                    }, {
                        "type": "Polygon",
                        "id": 8063,
                        "arcs": [[-3620, 3939, 3940, 3941, 3942, -3368, -3366]]
                    }, {
                        "type": "Polygon",
                        "id": 34011,
                        "arcs": [[3943, 3944, -3785, -3725, -3808, 3945, 3946]]
                    }, {
                        "type": "Polygon",
                        "id": 20163,
                        "arcs": [[3947, 3948, 3949, 3950, -3651, -3634]]
                    }, {
                        "type": "Polygon",
                        "id": 39027,
                        "arcs": [[3951, 3952, -3933, -3746, -3853, 3953]]
                    }, {
                        "type": "Polygon",
                        "id": 20181,
                        "arcs": [[-3623, 3954, 3955, 3956, -3940, -3619]]
                    }, {
                        "type": "Polygon",
                        "id": 20193,
                        "arcs": [[-3644, 3957, 3958, 3959, -3955, -3622]]
                    }, {
                        "type": "Polygon",
                        "id": 20141,
                        "arcs": [[-3631, 3960, 3961, 3962, 3963, -3948, -3633]]
                    }, {
                        "type": "Polygon",
                        "id": 20179,
                        "arcs": [[-3650, 3964, 3965, -3958, -3643]]
                    }, {
                        "type": "Polygon",
                        "id": 20027,
                        "arcs": [[3966, 3967, 3968, 3969, -3878, -3640]]
                    }, {
                        "type": "Polygon",
                        "id": 20123,
                        "arcs": [[-3880, 3970, 3971, -3961, -3630]]
                    }, {
                        "type": "Polygon",
                        "id": 20065,
                        "arcs": [[-3951, 3972, 3973, -3965, -3649, -3652]]
                    }, {
                        "type": "Polygon",
                        "id": 20161,
                        "arcs": [[3974, 3975, 3976, -3967, -3639, -3655]]
                    }, {
                        "type": "Polygon",
                        "id": 8035,
                        "arcs": [[3977, 3978, 3979, -3719, -3800]]
                    }, {
                        "type": "Polygon",
                        "id": 8039,
                        "arcs": [[3980, 3981, -3978, -3799]]
                    }, {
                        "type": "Polygon",
                        "id": 20149,
                        "arcs": [[-3664, -3884, 3982, 3983, -3975, -3654]]
                    }, {
                        "type": "Polygon",
                        "id": 8073,
                        "arcs": [[-3943, 3984, 3985, 3986, 3987, -3981, -3798, -3369]]
                    }, {
                        "type": "Polygon",
                        "id": 8093,
                        "arcs": [[-3721, 3988, 3989, 3990, 3991, -3707, -3744]]
                    }, {
                        "type": "Polygon",
                        "id": 39009,
                        "arcs": [[-3897, 3992, 3993, 3994, -3875, -3697, -3794]]
                    }, {
                        "type": "Polygon",
                        "id": 49027,
                        "arcs": [[-3767, 3995, 3996, 3997, -3563, -3614]]
                    }, {
                        "type": "Polygon",
                        "id": 54027,
                        "arcs": [[-3866, 3998, 3999, -3892, -3818]]
                    }, {
                        "type": "Polygon",
                        "id": 29165,
                        "arcs": [[-3761, -3797, 4000, 4001, 4002, -3885]]
                    }, {
                        "type": "Polygon",
                        "id": 18047,
                        "arcs": [[-3810, -3932, 4003, 4004, 4005, -3778, -3776]]
                    }, {
                        "type": "Polygon",
                        "id": 29177,
                        "arcs": [[-3913, 4006, 4007, 4008, -3795, -3783]]
                    }, {
                        "type": "Polygon",
                        "id": 17135,
                        "arcs": [[-3759, -3891, 4009, 4010, 4011, 4012, -3671]]
                    }, {
                        "type": "Polygon",
                        "id": 17117,
                        "arcs": [[-4013, 4013, 4014, 4015, -3734, -3672]]
                    }, {
                        "type": "Polygon",
                        "id": 6057,
                        "arcs": [[-2393, 4016, -3903, -3791]]
                    }, {
                        "type": "Polygon",
                        "id": 17061,
                        "arcs": [[-3735, -4016, 4017, 4018, -3749, -3781]]
                    }, {
                        "type": "Polygon",
                        "id": 39141,
                        "arcs": [[-3877, 4019, 4020, 4021, 4022, -3851, -3769]]
                    }, {
                        "type": "Polygon",
                        "id": 54037,
                        "arcs": [[4023, 4024, -3909, -3813]]
                    }, {
                        "type": "Polygon",
                        "id": 49019,
                        "arcs": [[-3578, 4025, 4026, -3854, -3101]]
                    }, {
                        "type": "Polygon",
                        "id": 17023,
                        "arcs": [[-3919, 4027, 4028, 4029, 4030, -3870, -3729]]
                    }, {
                        "type": "Polygon",
                        "id": 54073,
                        "arcs": [[4031, 4032, -3895, -3925]]
                    }, {
                        "type": "Polygon",
                        "id": 18119,
                        "arcs": [[-3908, 4033, 4034, -3920, -3742]]
                    }, {
                        "type": "Polygon",
                        "id": 54033,
                        "arcs": [[4035, 4036, 4037, 4038, 4039, -3838, -3899]]
                    }, {
                        "type": "Polygon",
                        "id": 51069,
                        "arcs": [[4040, 4041, 4042, 4043, -3999, -3865, -3910]]
                    }, {
                        "type": "Polygon",
                        "id": 29047,
                        "arcs": [[-3796, -4009, 4044, 4045, -4001]]
                    }, {
                        "type": "Polygon",
                        "id": 18031,
                        "arcs": [[-4006, 4046, 4047, 4048, -3861, -3779]]
                    }, {
                        "type": "Polygon",
                        "id": 54091,
                        "arcs": [[4049, -4036, -3898, -3828, -3834]]
                    }, {
                        "type": "Polygon",
                        "id": 54017,
                        "arcs": [[-4040, 4050, 4051, 4052, -3923, -3839]]
                    }, {
                        "type": "Polygon",
                        "id": 20087,
                        "arcs": [[4053, 4054, 4055, -3882, -3887]]
                    }, {
                        "type": "Polygon",
                        "id": 20103,
                        "arcs": [[-4003, 4056, 4057, 4058, -4054, -3886]]
                    }, {
                        "type": "Polygon",
                        "id": 6011,
                        "arcs": [[-3542, 4059, 4060, -3936, -3771]]
                    }, {
                        "type": "Polygon",
                        "id": 29195,
                        "arcs": [[-3859, 4061, 4062, 4063, 4064, -3911]]
                    }, {
                        "type": "Polygon",
                        "id": 54107,
                        "arcs": [[-4033, 4065, 4066, 4067, 4068, -3993, -3896]]
                    }, {
                        "type": "Polygon",
                        "id": 17013,
                        "arcs": [[-4019, 4069, 4070, 4071, -3929, -3750]]
                    }, {
                        "type": "Polygon",
                        "id": 39163,
                        "arcs": [[-3995, 4072, 4073, 4074, -4020, -3876]]
                    }, {
                        "type": "Polygon",
                        "id": 54085,
                        "arcs": [[-4053, 4075, 4076, 4077, -4066, -4032, -3924]]
                    }, {
                        "type": "Polygon",
                        "id": 24029,
                        "arcs": [[-3755, 4078, 4079, 4080, -3824]]
                    }, {
                        "type": "Polygon",
                        "id": 8065,
                        "arcs": [[-3708, -3992, 4081, 4082, -3704]]
                    }, {
                        "type": "Polygon",
                        "id": 17035,
                        "arcs": [[-4031, 4083, 4084, -3888, -3871]]
                    }, {
                        "type": "Polygon",
                        "id": 39071,
                        "arcs": [[-4023, 4085, 4086, 4087, -3954, -3852]]
                    }, {
                        "type": "Polygon",
                        "id": 24510,
                        "arcs": [[4088, 4089, -3842]]
                    }, {
                        "type": "Polygon",
                        "id": 24027,
                        "arcs": [[-3844, 4090, 4091, 4092, -3848, -3846]]
                    }, {
                        "type": "Polygon",
                        "id": 8077,
                        "arcs": [[4093, 4094, 4095, 4096, -4026, -3577]]
                    }, {
                        "type": "Polygon",
                        "id": 8097,
                        "arcs": [[-4083, 4097, 4098, -4094, -3576, -3705]]
                    }, {
                        "type": "Polygon",
                        "id": 10001,
                        "arcs": [[4099, 4100, 4101, -4079, -3754, 4102]]
                    }, {
                        "type": "Polygon",
                        "id": 18105,
                        "arcs": [[4103, 4104, 4105, 4106, -4034, -3907]]
                    }, {
                        "type": "Polygon",
                        "id": 18005,
                        "arcs": [[-4049, 4107, 4108, 4109, -3900, -3862]]
                    }, {
                        "type": "Polygon",
                        "id": 29007,
                        "arcs": [[-3868, -3928, 4110, 4111, 4112, -3914, -3873]]
                    }, {
                        "type": "Polygon",
                        "id": 24031,
                        "arcs": [[4113, 4114, 4115, 4116, -3849, -4093]]
                    }, {
                        "type": "Polygon",
                        "id": 18013,
                        "arcs": [[-4110, 4117, -4104, -3906, -3901]]
                    }, {
                        "type": "Polygon",
                        "id": 29089,
                        "arcs": [[4118, -4062, -3858, -3916, 4119]]
                    }, {
                        "type": "Polygon",
                        "id": 54023,
                        "arcs": [[4120, 4121, 4122, 4123, -3831, -3822, -3893]]
                    }, {
                        "type": "Polygon",
                        "id": 34009,
                        "arcs": [[4124, -3946, -3807]]
                    }, {
                        "type": "Polygon",
                        "id": 51107,
                        "arcs": [[-4117, 4125, 4126, 4127, 4128, -4024, -3812, -3850]]
                    }, {
                        "type": "Polygon",
                        "id": 6061,
                        "arcs": [[-2392, 4129, 4130, 4131, 4132, 4133, -3904, -4017]]
                    }, {
                        "type": "Polygon",
                        "id": 39061,
                        "arcs": [[-3935, 4134, 4135, 4136, 4137, 4138, -3931]]
                    }, {
                        "type": "Polygon",
                        "id": 18137,
                        "arcs": [[4139, 4140, 4141, 4142, 4143, -4047, -4005]]
                    }, {
                        "type": "Polygon",
                        "id": 18029,
                        "arcs": [[-4004, -4139, 4144, 4145, -4140]]
                    }, {
                        "type": "Polygon",
                        "id": 20143,
                        "arcs": [[-3970, 4146, 4147, 4148, -3971, -3879]]
                    }, {
                        "type": "Polygon",
                        "id": 6101,
                        "arcs": [[-3905, -4134, 4149, 4150, -4060, -3541]]
                    }, {
                        "type": "Polygon",
                        "id": 54001,
                        "arcs": [[4151, 4152, 4153, -4037, -4050, -3833]]
                    }, {
                        "type": "Polygon",
                        "id": 29107,
                        "arcs": [[4154, 4155, 4156, -4007, -3912, -4065]]
                    }, {
                        "type": "Polygon",
                        "id": 54093,
                        "arcs": [[4157, -4152, -3832, -4124]]
                    }, {
                        "type": "Polygon",
                        "id": 39025,
                        "arcs": [[4158, 4159, 4160, -4135, -3934, -3953, 4161]]
                    }, {
                        "type": "Polygon",
                        "id": 51043,
                        "arcs": [[-4129, 4162, 4163, -4041, -4025]]
                    }, {
                        "type": "Polygon",
                        "id": 17083,
                        "arcs": [[-4015, 4164, 4165, -4070, -4018]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 24035,
                        "arcs": [[[4166]], [[-4102, 4167, 4168, 4169, -4080]]]
                    }, {
                        "type": "Polygon",
                        "id": 18153,
                        "arcs": [[-3922, 4170, 4171, 4172, -4028, -3918]]
                    }, {
                        "type": "Polygon",
                        "id": 8051,
                        "arcs": [[-4099, 4173, 4174, 4175, 4176, 4177, 4178, -4095]]
                    }, {
                        "type": "Polygon",
                        "id": 39015,
                        "arcs": [[4179, 4180, 4181, -4162, -3952, -4088]]
                    }, {
                        "type": "Polygon",
                        "id": 29019,
                        "arcs": [[-4113, 4182, 4183, 4184, 4185, -4120, -3915]]
                    }, {
                        "type": "Polygon",
                        "id": 32510,
                        "arcs": [[4186, -4130, -2391, -3804]]
                    }, {
                        "type": "Polygon",
                        "id": 54031,
                        "arcs": [[-4044, 4187, 4188, 4189, -4121, -4000]]
                    }, {
                        "type": "Polygon",
                        "id": 24003,
                        "arcs": [[4190, 4191, -4091, -3843, -4090, 4192, 4193, 4194]]
                    }, {
                        "type": "Polygon",
                        "id": 29095,
                        "arcs": [[-4008, -4157, 4195, 4196, 4197, 4198, -4045]]
                    }, {
                        "type": "Polygon",
                        "id": 29113,
                        "arcs": [[-4072, 4199, 4200, 4201, -3926]]
                    }, {
                        "type": "Polygon",
                        "id": 20061,
                        "arcs": [[4202, 4203, 4204, -3968, -3977]]
                    }, {
                        "type": "Polygon",
                        "id": 8029,
                        "arcs": [[-4179, 4205, -4096]]
                    }, {
                        "type": "Polygon",
                        "id": 20105,
                        "arcs": [[-4149, 4206, 4207, 4208, -3962, -3972]]
                    }, {
                        "type": "Polygon",
                        "id": 20177,
                        "arcs": [[-4056, 4209, 4210, 4211, -3983, -3883]]
                    }, {
                        "type": "Polygon",
                        "id": 17051,
                        "arcs": [[-3890, 4212, 4213, 4214, 4215, 4216, -4010]]
                    }, {
                        "type": "Polygon",
                        "id": 17049,
                        "arcs": [[-4085, 4217, 4218, -4213, -3889]]
                    }, {
                        "type": "Polygon",
                        "id": 20197,
                        "arcs": [[-4212, 4219, 4220, 4221, -4203, -3976, -3984]]
                    }, {
                        "type": "Polygon",
                        "id": 39079,
                        "arcs": [[4222, 4223, 4224, 4225, -4021, -4075]]
                    }, {
                        "type": "Polygon",
                        "id": 39105,
                        "arcs": [[4226, 4227, -4073, -3994, -4069, 4228]]
                    }, {
                        "type": "Polygon",
                        "id": 20209,
                        "arcs": [[-4002, -4046, -4199, 4229, -4057]]
                    }, {
                        "type": "Polygon",
                        "id": 39131,
                        "arcs": [[4230, 4231, -4086, -4022, -4226]]
                    }, {
                        "type": "Polygon",
                        "id": 18079,
                        "arcs": [[4232, 4233, 4234, -4108, -4048, -4144]]
                    }, {
                        "type": "Polygon",
                        "id": 54105,
                        "arcs": [[4235, 4236, 4237, -4067, -4078]]
                    }, {
                        "type": "Polygon",
                        "id": 17033,
                        "arcs": [[-4173, 4238, 4239, 4240, 4241, -4029]]
                    }, {
                        "type": "Polygon",
                        "id": 17079,
                        "arcs": [[-4242, 4242, 4243, -4218, -4084, -4030]]
                    }, {
                        "type": "Polygon",
                        "id": 18055,
                        "arcs": [[-4035, -4107, 4244, 4245, 4246, 4247, -4171, -3921]]
                    }, {
                        "type": "Polygon",
                        "id": 54041,
                        "arcs": [[4248, 4249, 4250, 4251, -4051, -4039]]
                    }, {
                        "type": "Polygon",
                        "id": 32023,
                        "arcs": [[-2993, -3565, 4252, 4253, 4254, 4255, 4256, -3645, -2995]]
                    }, {
                        "type": "Polygon",
                        "id": 29139,
                        "arcs": [[-3927, -4202, 4257, 4258, 4259, 4260, -4111]]
                    }, {
                        "type": "Polygon",
                        "id": 21015,
                        "arcs": [[4261, 4262, 4263, 4264, 4265, -4145, -4138]]
                    }, {
                        "type": "Polygon",
                        "id": 24011,
                        "arcs": [[4266, 4267, 4268, 4269, -4168, -4101]]
                    }, {
                        "type": "Polygon",
                        "id": 20109,
                        "arcs": [[4270, 4271, 4272, 4273, -3956, -3960]]
                    }, {
                        "type": "Polygon",
                        "id": 20199,
                        "arcs": [[-4274, 4274, 4275, 4276, -3941, -3957]]
                    }, {
                        "type": "Polygon",
                        "id": 20051,
                        "arcs": [[-3964, 4277, 4278, 4279, 4280, -3949]]
                    }, {
                        "type": "Polygon",
                        "id": 20063,
                        "arcs": [[-3966, -3974, 4281, 4282, 4283, 4284, -4271, -3959]]
                    }, {
                        "type": "Polygon",
                        "id": 20041,
                        "arcs": [[-4205, 4285, 4286, 4287, -4147, -3969]]
                    }, {
                        "type": "Polygon",
                        "id": 20167,
                        "arcs": [[-4209, 4288, 4289, 4290, -4278, -3963]]
                    }, {
                        "type": "Polygon",
                        "id": 20195,
                        "arcs": [[-3950, -4281, 4291, -4282, -3973]]
                    }, {
                        "type": "Polygon",
                        "id": 24033,
                        "arcs": [[-4192, 4292, 4293, 4294, 4295, 4296, -4114, -4092]]
                    }, {
                        "type": "Polygon",
                        "id": 8119,
                        "arcs": [[4297, 4298, -3989, -3720, -3980]]
                    }, {
                        "type": "Polygon",
                        "id": 8041,
                        "arcs": [[-3982, -3988, 4299, 4300, -4298, -3979]]
                    }, {
                        "type": "Polygon",
                        "id": 21037,
                        "arcs": [[-4161, 4301, 4302, -4136]]
                    }, {
                        "type": "Polygon",
                        "id": 54083,
                        "arcs": [[-4123, 4303, 4304, 4305, 4306, -4153, -4158]]
                    }, {
                        "type": "Polygon",
                        "id": 32005,
                        "arcs": [[-3803, 4307, 4308, 4309, -4131, -4187]]
                    }, {
                        "type": "Polygon",
                        "id": 54097,
                        "arcs": [[-4154, -4307, 4310, -4249, -4038]]
                    }, {
                        "type": "Polygon",
                        "id": 54021,
                        "arcs": [[-4252, 4311, 4312, -4076, -4052]]
                    }, {
                        "type": "Polygon",
                        "id": 51171,
                        "arcs": [[4313, 4314, 4315, -4188, -4043]]
                    }, {
                        "type": "Polygon",
                        "id": 21117,
                        "arcs": [[-4303, 4316, 4317, -4262, -4137]]
                    }, {
                        "type": "Polygon",
                        "id": 54035,
                        "arcs": [[-4238, 4318, 4319, 4320, 4321, -4229, -4068]]
                    }, {
                        "type": "Polygon",
                        "id": 32021,
                        "arcs": [[-4257, 4322, 4323, -3801, -3646]]
                    }, {
                        "type": "Polygon",
                        "id": 18071,
                        "arcs": [[-4235, 4324, 4325, 4326, -4105, -4118, -4109]]
                    }, {
                        "type": "Polygon",
                        "id": 20045,
                        "arcs": [[-4059, 4327, 4328, 4329, -4210, -4055]]
                    }, {
                        "type": "Polygon",
                        "id": 6017,
                        "arcs": [[-4310, 4330, 4331, 4332, -4132]]
                    }, {
                        "type": "Polygon",
                        "id": 29027,
                        "arcs": [[-4112, -4261, 4333, 4334, -4183]]
                    }, {
                        "type": "Polygon",
                        "id": 29053,
                        "arcs": [[-4186, 4335, 4336, 4337, -4063, -4119]]
                    }, {
                        "type": "Polygon",
                        "id": 51059,
                        "arcs": [[4338, 4339, 4340, 4341, 4342, 4343, -4126, -4116]]
                    }, {
                        "type": "Polygon",
                        "id": 8015,
                        "arcs": [[-3991, 4344, 4345, -4174, -4098, -4082]]
                    }, {
                        "type": "Polygon",
                        "id": 20091,
                        "arcs": [[-4198, 4346, 4347, -4328, -4058, -4230]]
                    }, {
                        "type": "Polygon",
                        "id": 39001,
                        "arcs": [[4348, 4349, 4350, -4180, -4087, -4232]]
                    }, {
                        "type": "Polygon",
                        "id": 49041,
                        "arcs": [[-3856, 4351, 4352, 4353, -3996, -3766]]
                    }, {
                        "type": "Polygon",
                        "id": 8017,
                        "arcs": [[-4277, 4354, 4355, -3985, -3942]]
                    }, {
                        "type": "Polygon",
                        "id": 54013,
                        "arcs": [[-4313, 4356, 4357, 4358, -4236, -4077]]
                    }, {
                        "type": "Polygon",
                        "id": 51187,
                        "arcs": [[4359, 4360, 4361, -4314, -4042, -4164]]
                    }, {
                        "type": "Polygon",
                        "id": 39053,
                        "arcs": [[4362, 4363, 4364, -4223, -4074, -4228]]
                    }, {
                        "type": "Polygon",
                        "id": 18115,
                        "arcs": [[4365, -4141, -4146, -4266]]
                    }, {
                        "type": "Polygon",
                        "id": 54053,
                        "arcs": [[-4322, 4366, 4367, -4363, -4227]]
                    }, {
                        "type": "Polygon",
                        "id": 17005,
                        "arcs": [[-4217, 4368, 4369, -4011]]
                    }, {
                        "type": "Polygon",
                        "id": 39145,
                        "arcs": [[-4225, 4370, 4371, 4372, -4349, -4231]]
                    }, {
                        "type": "Polygon",
                        "id": 51061,
                        "arcs": [[4373, 4374, 4375, 4376, -4360, -4163, -4128]]
                    }, {
                        "type": "Polygon",
                        "id": 17119,
                        "arcs": [[-4014, -4012, -4370, 4377, 4378, 4379, 4380, 4381, -4165]]
                    }, {
                        "type": "Polygon",
                        "id": 29219,
                        "arcs": [[4382, 4383, 4384, -4258, -4201]]
                    }, {
                        "type": "Polygon",
                        "id": 11001,
                        "arcs": [[4385, 4386, -4115, -4297]]
                    }, {
                        "type": "Polygon",
                        "id": 18093,
                        "arcs": [[-4327, 4387, 4388, 4389, -4245, -4106]]
                    }, {
                        "type": "Polygon",
                        "id": 29183,
                        "arcs": [[-4382, 4390, 4391, -4383, -4200, -4071, -4166]]
                    }, {
                        "type": "Polygon",
                        "id": 10005,
                        "arcs": [[4392, 4393, 4394, 4395, 4396, 4397, -4267, -4100]]
                    }, {
                        "type": "Polygon",
                        "id": 20169,
                        "arcs": [[-4288, 4398, 4399, -4207, -4148]]
                    }, {
                        "type": "Polygon",
                        "id": 54071,
                        "arcs": [[-4190, 4400, 4401, 4402, 4403, -4304, -4122]]
                    }, {
                        "type": "Polygon",
                        "id": 29159,
                        "arcs": [[-4338, 4404, 4405, 4406, 4407, -4155, -4064]]
                    }, {
                        "type": "Polygon",
                        "id": 24041,
                        "arcs": [[-4270, 4408, -4169]]
                    }, {
                        "type": "Polygon",
                        "id": 51153,
                        "arcs": [[-4344, 4409, 4410, -4374, -4127]]
                    }, {
                        "type": "Polygon",
                        "id": 54087,
                        "arcs": [[-4359, 4411, 4412, -4319, -4237]]
                    }, {
                        "type": "Polygon",
                        "id": 29101,
                        "arcs": [[-4408, 4413, 4414, -4196, -4156]]
                    }, {
                        "type": "Polygon",
                        "id": 51013,
                        "arcs": [[4415, -4341, 4416, -4339, -4387, 4417]]
                    }, {
                        "type": "Polygon",
                        "id": 6003,
                        "arcs": [[4418, 4419, 4420, 4421, -4331, -4309]]
                    }, {
                        "type": "Polygon",
                        "id": 18155,
                        "arcs": [[-4265, 4422, 4423, 4424, -4142, -4366]]
                    }, {
                        "type": "Polygon",
                        "id": 29135,
                        "arcs": [[4425, 4426, 4427, -4336, -4185]]
                    }, {
                        "type": "Polygon",
                        "id": 6113,
                        "arcs": [[-4151, 4428, 4429, 4430, -4431, 4431, -3937, -4061]]
                    }, {
                        "type": "Polygon",
                        "id": 18077,
                        "arcs": [[-4425, 4432, 4433, 4434, 4435, -4233, -4143]]
                    }, {
                        "type": "Polygon",
                        "id": 17025,
                        "arcs": [[-4244, 4436, 4437, 4438, -4214, -4219]]
                    }, {
                        "type": "Polygon",
                        "id": 18083,
                        "arcs": [[4439, 4440, 4441, 4442, 4443, 4444, -4239, -4172, -4248]]
                    }, {
                        "type": "Polygon",
                        "id": 18101,
                        "arcs": [[-4390, 4445, 4446, 4447, -4246]]
                    }, {
                        "type": "Polygon",
                        "id": 18027,
                        "arcs": [[4448, 4449, -4440, -4247, -4448]]
                    }, {
                        "type": "Polygon",
                        "id": 54007,
                        "arcs": [[-4251, 4450, 4451, 4452, -4357, -4312]]
                    }, {
                        "type": "Polygon",
                        "id": 29189,
                        "arcs": [[-4381, 4453, 4454, 4455, 4456, 4457, -4391]]
                    }, {
                        "type": "Polygon",
                        "id": 21191,
                        "arcs": [[4458, 4459, 4460, -4317, -4302, -4160, 4461]]
                    }, {
                        "type": "Polygon",
                        "id": 20127,
                        "arcs": [[-4222, 4462, 4463, 4464, -4286, -4204]]
                    }, {
                        "type": "Polygon",
                        "id": 20053,
                        "arcs": [[-4400, 4465, 4466, 4467, -4289, -4208]]
                    }, {
                        "type": "Polygon",
                        "id": 20139,
                        "arcs": [[-4330, 4468, 4469, 4470, -4220, -4211]]
                    }, {
                        "type": "Polygon",
                        "id": 6055,
                        "arcs": [[4430, 4471, 4472, 4473, 4474, 4475, -3938, -4432]]
                    }, {
                        "type": "Polygon",
                        "id": 51157,
                        "arcs": [[4476, 4477, 4478, -4361, -4377]]
                    }, {
                        "type": "Polygon",
                        "id": 21077,
                        "arcs": [[4479, 4480, 4481, -4423, -4264]]
                    }, {
                        "type": "Polygon",
                        "id": 6097,
                        "arcs": [[-3939, -4476, 4482, 4483, 4484, -3626]]
                    }, {
                        "type": "Polygon",
                        "id": 17101,
                        "arcs": [[4485, 4486, -4240, -4445]]
                    }, {
                        "type": "Polygon",
                        "id": 51165,
                        "arcs": [[-4316, 4487, 4488, 4489, 4490, -4401, -4189]]
                    }, {
                        "type": "Polygon",
                        "id": 17159,
                        "arcs": [[-4241, -4487, 4491, 4492, 4493, -4437, -4243]]
                    }, {
                        "type": "Polygon",
                        "id": 39087,
                        "arcs": [[4494, 4495, 4496, 4497, -4371, -4224, -4365]]
                    }, {
                        "type": "Polygon",
                        "id": 29037,
                        "arcs": [[-4415, 4498, 4499, 4500, -4347, -4197]]
                    }, {
                        "type": "Polygon",
                        "id": 51139,
                        "arcs": [[-4479, 4501, 4502, -4488, -4315, -4362]]
                    }, {
                        "type": "Polygon",
                        "id": 18143,
                        "arcs": [[-4436, 4503, 4504, -4325, -4234]]
                    }, {
                        "type": "Polygon",
                        "id": 21023,
                        "arcs": [[-4182, 4505, 4506, 4507, -4462, -4159]]
                    }, {
                        "type": "Polygon",
                        "id": 17121,
                        "arcs": [[-4439, 4508, 4509, 4510, 4511, -4215]]
                    }, {
                        "type": "Polygon",
                        "id": 21081,
                        "arcs": [[-4318, -4461, 4512, 4513, 4514, -4480, -4263]]
                    }, {
                        "type": "Polygon",
                        "id": 18175,
                        "arcs": [[-4505, 4515, 4516, 4517, 4518, 4519, -4388, -4326]]
                    }, {
                        "type": "Polygon",
                        "id": 29510,
                        "arcs": [[-4454, -4380, 4520]]
                    }, {
                        "type": "Polygon",
                        "id": 24009,
                        "arcs": [[4521, -4293, -4191]]
                    }, {
                        "type": "Polygon",
                        "id": 21161,
                        "arcs": [[-4351, 4522, 4523, 4524, -4506, -4181]]
                    }, {
                        "type": "Polygon",
                        "id": 21041,
                        "arcs": [[4525, 4526, 4527, -4433, -4424, -4482]]
                    }, {
                        "type": "Polygon",
                        "id": 21089,
                        "arcs": [[-4498, 4528, 4529, 4530, -4372]]
                    }, {
                        "type": "Polygon",
                        "id": 17027,
                        "arcs": [[-4216, -4512, 4531, 4532, 4533, -4378, -4369]]
                    }, {
                        "type": "Polygon",
                        "id": 54075,
                        "arcs": [[-4404, 4534, 4535, 4536, 4537, -4305]]
                    }, {
                        "type": "Polygon",
                        "id": 29051,
                        "arcs": [[-4335, 4538, 4539, -4426, -4184]]
                    }, {
                        "type": "Polygon",
                        "id": 20111,
                        "arcs": [[-4471, 4540, 4541, 4542, -4463, -4221]]
                    }, {
                        "type": "Polygon",
                        "id": 20059,
                        "arcs": [[4543, 4544, 4545, -4469, -4329]]
                    }, {
                        "type": "Polygon",
                        "id": 20121,
                        "arcs": [[-4501, 4546, 4547, -4544, -4348]]
                    }, {
                        "type": "Polygon",
                        "id": 54101,
                        "arcs": [[-4311, -4306, -4538, 4548, 4549, -4451, -4250]]
                    }, {
                        "type": "Polygon",
                        "id": 6067,
                        "arcs": [[4550, 4551, 4552, 4553, -4429, -4150, -4133, -4333]]
                    }, {
                        "type": "Polygon",
                        "id": 21223,
                        "arcs": [[-4528, 4554, 4555, 4556, -4434]]
                    }, {
                        "type": "Polygon",
                        "id": 21187,
                        "arcs": [[-4515, 4557, 4558, 4559, -4526, -4481]]
                    }, {
                        "type": "Polygon",
                        "id": 21135,
                        "arcs": [[4560, 4561, 4562, -4523, -4350, -4373, -4531]]
                    }, {
                        "type": "Polygon",
                        "id": 29073,
                        "arcs": [[-4385, 4563, 4564, 4565, 4566, 4567, -4259]]
                    }, {
                        "type": "Polygon",
                        "id": 6051,
                        "arcs": [[-3802, -4324, 4568, 4569, 4570, 4571, 4572, -4419, -4308]]
                    }, {
                        "type": "Polygon",
                        "id": 29071,
                        "arcs": [[-4392, -4458, 4573, 4574, 4575, -4564, -4384]]
                    }, {
                        "type": "Polygon",
                        "id": 29151,
                        "arcs": [[-4260, -4568, 4576, 4577, -4539, -4334]]
                    }, {
                        "type": "Polygon",
                        "id": 6005,
                        "arcs": [[-4422, 4578, 4579, -4551, -4332]]
                    }, {
                        "type": "Polygon",
                        "id": 24019,
                        "arcs": [[-4268, -4398, 4580, 4581]]
                    }, {
                        "type": "Polygon",
                        "id": 20171,
                        "arcs": [[-4285, 4582, 4583, 4584, 4585, -4272]]
                    }, {
                        "type": "Polygon",
                        "id": 20101,
                        "arcs": [[4586, 4587, -4583, -4284]]
                    }, {
                        "type": "Polygon",
                        "id": 20071,
                        "arcs": [[4588, 4589, 4590, 4591, -4355, -4276]]
                    }, {
                        "type": "Polygon",
                        "id": 20203,
                        "arcs": [[-4586, 4592, 4593, -4589, -4275, -4273]]
                    }, {
                        "type": "Polygon",
                        "id": 51047,
                        "arcs": [[4594, 4595, 4596, 4597, -4477, -4376]]
                    }, {
                        "type": "Polygon",
                        "id": 20135,
                        "arcs": [[-4292, -4280, 4598, 4599, 4600, 4601, -4587, -4283]]
                    }, {
                        "type": "Polygon",
                        "id": 29141,
                        "arcs": [[-4428, 4602, 4603, 4604, -4405, -4337]]
                    }, {
                        "type": "Polygon",
                        "id": 20009,
                        "arcs": [[-4468, 4605, 4606, 4607, 4608, -4290]]
                    }, {
                        "type": "Polygon",
                        "id": 8043,
                        "arcs": [[-4301, 4609, 4610, 4611, -4345, -3990, -4299]]
                    }, {
                        "type": "Polygon",
                        "id": 20165,
                        "arcs": [[-4291, -4609, 4612, -4599, -4279]]
                    }, {
                        "type": "Polygon",
                        "id": 24017,
                        "arcs": [[-4295, 4613, 4614, 4615]]
                    }, {
                        "type": "Polygon",
                        "id": 18117,
                        "arcs": [[-4520, 4616, 4617, -4446, -4389]]
                    }, {
                        "type": "Polygon",
                        "id": 54079,
                        "arcs": [[4618, 4619, -4367, -4321, 4620]]
                    }, {
                        "type": "Polygon",
                        "id": 32017,
                        "arcs": [[-3998, 4621, 4622, 4623, 4624, 4625, -4253, -3564]]
                    }, {
                        "type": "Polygon",
                        "id": 8085,
                        "arcs": [[-4178, 4626, 4627, 4628, -4097, -4206]]
                    }, {
                        "type": "Polygon",
                        "id": 54015,
                        "arcs": [[4629, 4630, -4412, -4358, -4453]]
                    }, {
                        "type": "Polygon",
                        "id": 17163,
                        "arcs": [[-4534, 4631, 4632, 4633, -4455, -4521, -4379]]
                    }, {
                        "type": "Polygon",
                        "id": 51113,
                        "arcs": [[-4598, 4634, 4635, -4502, -4478]]
                    }, {
                        "type": "Polygon",
                        "id": 54039,
                        "arcs": [[-4413, -4631, 4636, 4637, 4638, 4639, 4640, -4621, -4320]]
                    }, {
                        "type": "Polygon",
                        "id": 8061,
                        "arcs": [[-4592, 4641, 4642, 4643, 4644, -3986, -4356]]
                    }, {
                        "type": "Polygon",
                        "id": 20113,
                        "arcs": [[4645, 4646, 4647, 4648, -4466, -4399]]
                    }, {
                        "type": "Polygon",
                        "id": 20115,
                        "arcs": [[-4465, 4649, 4650, 4651, -4646, -4287]]
                    }, {
                        "type": "Polygon",
                        "id": 21201,
                        "arcs": [[-4525, 4652, 4653, 4654, -4507]]
                    }, {
                        "type": "Polygon",
                        "id": 17191,
                        "arcs": [[-4494, 4655, 4656, 4657, 4658, -4509, -4438]]
                    }, {
                        "type": "Polygon",
                        "id": 18019,
                        "arcs": [[-4557, 4659, 4660, 4661, -4516, -4504, -4435]]
                    }, {
                        "type": "Polygon",
                        "id": 54011,
                        "arcs": [[-4368, -4620, 4662, 4663, -4495, -4364]]
                    }, {
                        "type": "Polygon",
                        "id": 21103,
                        "arcs": [[4664, 4665, 4666, -4555, -4527, -4560]]
                    }, {
                        "type": "Polygon",
                        "id": 51091,
                        "arcs": [[4667, 4668, -4535, -4403]]
                    }, {
                        "type": "Polygon",
                        "id": 51179,
                        "arcs": [[4669, 4670, 4671, 4672, 4673, 4674, -4595, -4375, -4411]]
                    }, {
                        "type": "Polygon",
                        "id": 21097,
                        "arcs": [[-4655, 4675, 4676, 4677, -4513, -4460, -4459, -4508]]
                    }, {
                        "type": "Polygon",
                        "id": 49001,
                        "arcs": [[-4354, 4678, 4679, 4680, -4622, -3997]]
                    }, {
                        "type": "Polygon",
                        "id": 17047,
                        "arcs": [[4681, 4682, -4656, -4493]]
                    }, {
                        "type": "Polygon",
                        "id": 17185,
                        "arcs": [[-4492, -4486, -4444, 4683, 4684, -4682]]
                    }, {
                        "type": "Polygon",
                        "id": 29083,
                        "arcs": [[-4407, 4685, 4686, 4687, -4499, -4414]]
                    }, {
                        "type": "Polygon",
                        "id": 24045,
                        "arcs": [[4688, 4689, 4690, -4581, -4397]]
                    }, {
                        "type": "Polygon",
                        "id": 54067,
                        "arcs": [[-4550, 4691, 4692, -4637, -4630, -4452]]
                    }, {
                        "type": "Polygon",
                        "id": 18125,
                        "arcs": [[4693, 4694, 4695, -4441, -4450]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 6095,
                        "arcs": [[[4696, -4474]], [[-4554, 4697, -4472, -4431, -4430]]]
                    }, {
                        "type": "Polygon",
                        "id": 29015,
                        "arcs": [[-4605, 4698, 4699, 4700, -4686, -4406]]
                    }, {
                        "type": "Polygon",
                        "id": 18051,
                        "arcs": [[4701, 4702, 4703, 4704, -4684, -4443, -4442, -4696]]
                    }, {
                        "type": "Polygon",
                        "id": 18037,
                        "arcs": [[-4618, 4705, 4706, 4707, 4708, -4694, -4449, -4447]]
                    }, {
                        "type": "Polygon",
                        "id": 21069,
                        "arcs": [[4709, 4710, 4711, -4653, -4524, -4563]]
                    }, {
                        "type": "Polygon",
                        "id": 21185,
                        "arcs": [[-4667, 4712, 4713, -4660, -4556]]
                    }, {
                        "type": "Polygon",
                        "id": 20017,
                        "arcs": [[-4543, 4714, 4715, -4650, -4464]]
                    }, {
                        "type": "Polygon",
                        "id": 8101,
                        "arcs": [[4716, 4717, 4718, 4719, 4720, -4610, -4300]]
                    }, {
                        "type": "Polygon",
                        "id": 8025,
                        "arcs": [[-4645, 4721, 4722, -4717, -3987]]
                    }, {
                        "type": "Polygon",
                        "id": 20159,
                        "arcs": [[-4649, 4723, 4724, -4606, -4467]]
                    }, {
                        "type": "Polygon",
                        "id": 17133,
                        "arcs": [[4725, 4726, 4727, -4456, -4634]]
                    }, {
                        "type": "Polygon",
                        "id": 17189,
                        "arcs": [[-4532, -4511, 4728, 4729, 4730, -4632, -4533]]
                    }, {
                        "type": "Polygon",
                        "id": 24037,
                        "arcs": [[-4615, 4731]]
                    }, {
                        "type": "Polygon",
                        "id": 6009,
                        "arcs": [[-4421, 4732, 4733, 4734, -4579]]
                    }, {
                        "type": "Polygon",
                        "id": 49031,
                        "arcs": [[4735, 4736, -4679, -4353]]
                    }, {
                        "type": "Polygon",
                        "id": 49055,
                        "arcs": [[-3855, 4737, 4738, -4736, -4352]]
                    }, {
                        "type": "Polygon",
                        "id": 29099,
                        "arcs": [[-4728, 4739, 4740, 4741, -4574, -4457]]
                    }, {
                        "type": "Polygon",
                        "id": 21019,
                        "arcs": [[4742, 4743, -4529, -4497, 4744]]
                    }, {
                        "type": "Polygon",
                        "id": 21043,
                        "arcs": [[-4744, 4745, 4746, 4747, -4561, -4530]]
                    }, {
                        "type": "Polygon",
                        "id": 49037,
                        "arcs": [[-4629, 4748, 4749, 4750, 4751, 4752, 4753, 4754, 4755, -4738, -4027]]
                    }, {
                        "type": "Polygon",
                        "id": 21209,
                        "arcs": [[4756, 4757, 4758, 4759, -4558, -4514, -4678]]
                    }, {
                        "type": "Polygon",
                        "id": 51079,
                        "arcs": [[4760, 4761, -4489, -4503, -4636]]
                    }, {
                        "type": "Polygon",
                        "id": 51015,
                        "arcs": [[4762, 4763, 4764, 4765, -4668, -4402, -4491]]
                    }, {
                        "type": "Polygon",
                        "id": 17081,
                        "arcs": [[-4659, 4766, 4767, 4768, -4729, -4510]]
                    }, {
                        "type": "Polygon",
                        "id": 29013,
                        "arcs": [[-4688, 4769, 4770, 4771, -4547, -4500]]
                    }, {
                        "type": "Polygon",
                        "id": 32009,
                        "arcs": [[4772, -4569, -4323, -4256]]
                    }, {
                        "type": "Polygon",
                        "id": 21181,
                        "arcs": [[-4712, 4773, 4774, -4676, -4654]]
                    }, {
                        "type": "Polygon",
                        "id": 8109,
                        "arcs": [[-4612, 4775, 4776, 4777, 4778, 4779, 4780, -4175, -4346]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 24047,
                        "arcs": [[[4781, 4782, 4783, -4689, -4396, 4784]]]
                    }, {
                        "type": "Polygon",
                        "id": 6109,
                        "arcs": [[-4573, 4785, 4786, 4787, -4733, -4420]]
                    }, {
                        "type": "Polygon",
                        "id": 20031,
                        "arcs": [[-4546, 4788, 4789, 4790, -4541, -4470]]
                    }, {
                        "type": "Polygon",
                        "id": 29131,
                        "arcs": [[-4540, -4578, 4791, 4792, 4793, -4603, -4427]]
                    }, {
                        "type": "Polygon",
                        "id": 18025,
                        "arcs": [[4794, 4795, 4796, -4706, -4617, -4519]]
                    }, {
                        "type": "Polygon",
                        "id": 18061,
                        "arcs": [[4797, 4798, 4799, 4800, -4795, -4518]]
                    }, {
                        "type": "Polygon",
                        "id": 54099,
                        "arcs": [[-4664, 4801, 4802, 4803, 4804, -4745, -4496]]
                    }, {
                        "type": "Polygon",
                        "id": 18043,
                        "arcs": [[-4662, 4805, -4798, -4517]]
                    }, {
                        "type": "Polygon",
                        "id": 51099,
                        "arcs": [[4806, 4807, 4808, 4809, -4671, 4810]]
                    }, {
                        "type": "Polygon",
                        "id": 21205,
                        "arcs": [[-4748, 4811, 4812, 4813, 4814, -4710, -4562]]
                    }, {
                        "type": "Polygon",
                        "id": 51137,
                        "arcs": [[4815, 4816, 4817, -4761, -4635, -4597]]
                    }, {
                        "type": "Polygon",
                        "id": 20003,
                        "arcs": [[4818, 4819, -4789, -4545]]
                    }, {
                        "type": "Polygon",
                        "id": 20107,
                        "arcs": [[-4772, 4820, 4821, -4819, -4548]]
                    }, {
                        "type": "Polygon",
                        "id": 21111,
                        "arcs": [[4822, 4823, 4824, 4825, -4799, -4806, -4661, -4714]]
                    }, {
                        "type": "Polygon",
                        "id": 51177,
                        "arcs": [[-4675, 4826, -4673, 4827, 4828, 4829, -4816, -4596]]
                    }, {
                        "type": "Polygon",
                        "id": 54043,
                        "arcs": [[-4619, -4641, 4830, 4831, 4832, -4802, -4663]]
                    }, {
                        "type": "Polygon",
                        "id": 21073,
                        "arcs": [[-4559, -4760, 4833, 4834, 4835, -4665]]
                    }, {
                        "type": "Polygon",
                        "id": 21017,
                        "arcs": [[4836, 4837, 4838, -4757, -4677, -4775]]
                    }, {
                        "type": "Polygon",
                        "id": 21211,
                        "arcs": [[4839, 4840, -4823, -4713, -4666, -4836]]
                    }, {
                        "type": "Polygon",
                        "id": 20145,
                        "arcs": [[-4608, 4841, 4842, 4843, -4600, -4613]]
                    }, {
                        "type": "Polygon",
                        "id": 8091,
                        "arcs": [[-4177, 4844, 4845, 4846, -4627]]
                    }, {
                        "type": "Polygon",
                        "id": 6041,
                        "arcs": [[4847, -4484]]
                    }, {
                        "type": "Polygon",
                        "id": 21011,
                        "arcs": [[-4815, 4848, 4849, -4774, -4711]]
                    }, {
                        "type": "Polygon",
                        "id": 6077,
                        "arcs": [[-4580, -4735, 4850, 4851, 4852, 4853, -4552]]
                    }, {
                        "type": "Polygon",
                        "id": 29125,
                        "arcs": [[-4567, 4854, 4855, -4792, -4577]]
                    }, {
                        "type": "Polygon",
                        "id": 24039,
                        "arcs": [[-4690, -4784, 4856, 4857, 4858]]
                    }, {
                        "type": "Polygon",
                        "id": 51003,
                        "arcs": [[-4818, 4859, 4860, 4861, 4862, -4763, -4490, -4762]]
                    }, {
                        "type": "Polygon",
                        "id": 51193,
                        "arcs": [[4863, 4864, 4865, -4807, 4866]]
                    }, {
                        "type": "Polygon",
                        "id": 29029,
                        "arcs": [[-4794, 4867, 4868, 4869, 4870, -4699, -4604]]
                    }, {
                        "type": "Polygon",
                        "id": 21127,
                        "arcs": [[-4805, 4871, 4872, 4873, 4874, -4746, -4743]]
                    }, {
                        "type": "Polygon",
                        "id": 51017,
                        "arcs": [[-4669, -4766, 4875, 4876, 4877, -4536]]
                    }, {
                        "type": "Polygon",
                        "id": 8099,
                        "arcs": [[-4591, 4878, 4879, 4880, 4881, -4642]]
                    }, {
                        "type": "Polygon",
                        "id": 54025,
                        "arcs": [[-4878, 4882, 4883, 4884, 4885, -4692, -4549, -4537]]
                    }, {
                        "type": "Polygon",
                        "id": 21063,
                        "arcs": [[-4875, 4886, -4812, -4747]]
                    }, {
                        "type": "Polygon",
                        "id": 8027,
                        "arcs": [[-4721, 4887, -4776, -4611]]
                    }, {
                        "type": "Polygon",
                        "id": 8011,
                        "arcs": [[-4882, 4888, 4889, 4890, -4643]]
                    }, {
                        "type": "Polygon",
                        "id": 8089,
                        "arcs": [[-4891, 4891, -4718, -4723, -4722, -4644]]
                    }, {
                        "type": "Polygon",
                        "id": 18123,
                        "arcs": [[4892, 4893, 4894, 4895, -4707, -4797]]
                    }, {
                        "type": "Polygon",
                        "id": 54019,
                        "arcs": [[-4693, -4886, 4896, 4897, -4638]]
                    }, {
                        "type": "Polygon",
                        "id": 20093,
                        "arcs": [[4898, 4899, 4900, -4593, -4585]]
                    }, {
                        "type": "Polygon",
                        "id": 20055,
                        "arcs": [[-4588, -4602, 4901, 4902, 4903, -4899, -4584]]
                    }, {
                        "type": "Polygon",
                        "id": 20075,
                        "arcs": [[-4901, 4904, -4879, -4590, -4594]]
                    }, {
                        "type": "Polygon",
                        "id": 17193,
                        "arcs": [[-4685, -4705, 4905, 4906, 4907, -4657, -4683]]
                    }, {
                        "type": "Polygon",
                        "id": 20185,
                        "arcs": [[-4725, 4908, 4909, 4910, -4842, -4607]]
                    }, {
                        "type": "Polygon",
                        "id": 20083,
                        "arcs": [[-4844, 4911, 4912, 4913, -4902, -4601]]
                    }, {
                        "type": "Polygon",
                        "id": 17065,
                        "arcs": [[-4908, 4914, 4915, 4916, -4767, -4658]]
                    }, {
                        "type": "Polygon",
                        "id": 51033,
                        "arcs": [[-4810, 4917, 4918, 4919, 4920, -4828, -4672]]
                    }, {
                        "type": "Polygon",
                        "id": 18173,
                        "arcs": [[-4709, 4921, 4922, 4923, 4924, 4925, -4702, -4695]]
                    }, {
                        "type": "Polygon",
                        "id": 18129,
                        "arcs": [[4926, 4927, 4928, 4929, -4906, -4704]]
                    }, {
                        "type": "Polygon",
                        "id": 54005,
                        "arcs": [[4930, 4931, 4932, -4831, -4640]]
                    }, {
                        "type": "Polygon",
                        "id": 17157,
                        "arcs": [[-4633, -4731, 4933, 4934, 4935, 4936, -4726]]
                    }, {
                        "type": "Polygon",
                        "id": 29185,
                        "arcs": [[-4701, 4937, 4938, 4939, 4940, -4770, -4687]]
                    }, {
                        "type": "Polygon",
                        "id": 17145,
                        "arcs": [[-4730, -4769, 4941, 4942, -4934]]
                    }, {
                        "type": "Polygon",
                        "id": 29055,
                        "arcs": [[-4576, 4943, 4944, 4945, 4946, -4565]]
                    }, {
                        "type": "Polygon",
                        "id": 21067,
                        "arcs": [[4947, 4948, 4949, 4950, -4758, -4839]]
                    }, {
                        "type": "Polygon",
                        "id": 29221,
                        "arcs": [[-4742, 4951, 4952, -4944, -4575]]
                    }, {
                        "type": "Polygon",
                        "id": 18147,
                        "arcs": [[-4896, 4953, 4954, -4923, -4922, -4708]]
                    }, {
                        "type": "Polygon",
                        "id": 21163,
                        "arcs": [[4955, 4956, -4893, -4796, -4801]]
                    }, {
                        "type": "Polygon",
                        "id": 21239,
                        "arcs": [[-4951, 4957, 4958, 4959, -4834, -4759]]
                    }, {
                        "type": "Polygon",
                        "id": 21173,
                        "arcs": [[4960, 4961, 4962, -4837, -4850]]
                    }, {
                        "type": "Polygon",
                        "id": 20079,
                        "arcs": [[4963, 4964, 4965, -4647, -4652]]
                    }, {
                        "type": "Polygon",
                        "id": 20073,
                        "arcs": [[-4542, -4791, 4966, 4967, 4968, 4969, -4715]]
                    }, {
                        "type": "Polygon",
                        "id": 20155,
                        "arcs": [[-4648, -4966, 4970, 4971, 4972, -4909, -4724]]
                    }, {
                        "type": "Polygon",
                        "id": 18163,
                        "arcs": [[-4926, 4973, 4974, -4927, -4703]]
                    }, {
                        "type": "Polygon",
                        "id": 29161,
                        "arcs": [[-4947, 4975, 4976, 4977, -4855, -4566]]
                    }, {
                        "type": "Polygon",
                        "id": 49017,
                        "arcs": [[-4756, 4978, 4979, -4680, -4737, -4739]]
                    }, {
                        "type": "Polygon",
                        "id": 51057,
                        "arcs": [[4980, 4981, -4918, -4809, 4982]]
                    }, {
                        "type": "Polygon",
                        "id": 8113,
                        "arcs": [[-4847, 4983, 4984, -4749, -4628]]
                    }, {
                        "type": "Polygon",
                        "id": 51109,
                        "arcs": [[-4830, 4985, 4986, 4987, -4860, -4817]]
                    }, {
                        "type": "Polygon",
                        "id": 49021,
                        "arcs": [[-4980, 4988, 4989, -4623, -4681]]
                    }, {
                        "type": "Polygon",
                        "id": 21215,
                        "arcs": [[4990, 4991, 4992, -4824, -4841]]
                    }, {
                        "type": "Polygon",
                        "id": 8053,
                        "arcs": [[-4781, 4993, 4994, 4995, 4996, -4845, -4176]]
                    }, {
                        "type": "Polygon",
                        "id": 21005,
                        "arcs": [[-4960, 4997, 4998, 4999, -4991, -4840, -4835]]
                    }, {
                        "type": "Polygon",
                        "id": 17055,
                        "arcs": [[-4917, 5000, 5001, 5002, -4942, -4768]]
                    }, {
                        "type": "Polygon",
                        "id": 51159,
                        "arcs": [[5003, 5004, 5005, -4865]]
                    }, {
                        "type": "Polygon",
                        "id": 29186,
                        "arcs": [[-4937, 5006, 5007, -4740, -4727]]
                    }, {
                        "type": "Polygon",
                        "id": 21029,
                        "arcs": [[5008, 5009, -4825, -4993]]
                    }, {
                        "type": "Polygon",
                        "id": 21175,
                        "arcs": [[-4874, 5010, 5011, 5012, 5013, -4813, -4887]]
                    }, {
                        "type": "Polygon",
                        "id": 21049,
                        "arcs": [[5014, 5015, 5016, -4948, -4838, -4963]]
                    }, {
                        "type": "Polygon",
                        "id": 6013,
                        "arcs": [[-4853, 5017, 5018]]
                    }, {
                        "type": "Polygon",
                        "id": 20015,
                        "arcs": [[-4716, -4970, 5019, 5020, 5021, -4964, -4651]]
                    }, {
                        "type": "Polygon",
                        "id": 20047,
                        "arcs": [[-4911, 5022, 5023, 5024, -4912, -4843]]
                    }, {
                        "type": "Polygon",
                        "id": 51163,
                        "arcs": [[5025, 5026, 5027, 5028, -4876, -4765, 5029]]
                    }, {
                        "type": "Polygon",
                        "id": 29187,
                        "arcs": [[-5008, 5030, 5031, 5032, -4952, -4741]]
                    }, {
                        "type": "Polygon",
                        "id": 6099,
                        "arcs": [[5033, 5034, 5035, -4851, -4734, -4788]]
                    }, {
                        "type": "Polygon",
                        "id": 29085,
                        "arcs": [[-4871, 5036, 5037, -4938, -4700]]
                    }, {
                        "type": "Polygon",
                        "id": 29217,
                        "arcs": [[-4941, 5038, 5039, 5040, 5041, -4821, -4771]]
                    }, {
                        "type": "Polygon",
                        "id": 21165,
                        "arcs": [[-4814, -5014, 5042, 5043, -4961, -4849]]
                    }, {
                        "type": "Polygon",
                        "id": 51125,
                        "arcs": [[5044, 5045, 5046, -5030, -4764, -4863]]
                    }, {
                        "type": "Polygon",
                        "id": 21027,
                        "arcs": [[5047, 5048, 5049, 5050, -4894, -4957]]
                    }, {
                        "type": "Polygon",
                        "id": 20207,
                        "arcs": [[5051, 5052, -4967, -4790]]
                    }, {
                        "type": "Polygon",
                        "id": 20001,
                        "arcs": [[5053, 5054, -5052, -4820]]
                    }, {
                        "type": "Polygon",
                        "id": 20011,
                        "arcs": [[-5042, 5055, 5056, -5054, -4822]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 51001,
                        "arcs": [[[5057, 5058, -4782, 5059]]]
                    }, {
                        "type": "Polygon",
                        "id": 54045,
                        "arcs": [[-4933, 5060, 5061, -4832]]
                    }, {
                        "type": "Polygon",
                        "id": 51133,
                        "arcs": [[5062, -5004, -4864, 5063]]
                    }, {
                        "type": "Polygon",
                        "id": 29169,
                        "arcs": [[-4856, -4978, 5064, 5065, -4868, -4793]]
                    }, {
                        "type": "Polygon",
                        "id": 8055,
                        "arcs": [[-4720, 5066, 5067, 5068, -4777, -4888]]
                    }, {
                        "type": "Polygon",
                        "id": 51085,
                        "arcs": [[-4921, 5069, 5070, 5071, 5072, -4986, -4829]]
                    }, {
                        "type": "Polygon",
                        "id": 51065,
                        "arcs": [[5073, 5074, -4861, -4988, 5075]]
                    }, {
                        "type": "Polygon",
                        "id": 21093,
                        "arcs": [[5076, 5077, 5078, 5079, 5080, -5048, -4956, -4800, -4826, -5010]]
                    }, {
                        "type": "Polygon",
                        "id": 21113,
                        "arcs": [[5081, 5082, 5083, -4958, -4950]]
                    }, {
                        "type": "Polygon",
                        "id": 21115,
                        "arcs": [[5084, 5085, 5086, -5011, -4873]]
                    }, {
                        "type": "Polygon",
                        "id": 20069,
                        "arcs": [[-4914, 5087, 5088, 5089, -4903]]
                    }, {
                        "type": "Polygon",
                        "id": 21091,
                        "arcs": [[-5051, 5090, 5091, -4954, -4895]]
                    }, {
                        "type": "Polygon",
                        "id": 54081,
                        "arcs": [[-4639, -4898, 5092, 5093, 5094, -4931]]
                    }, {
                        "type": "Polygon",
                        "id": 21179,
                        "arcs": [[-5000, 5095, 5096, 5097, -5077, -5009, -4992]]
                    }, {
                        "type": "Polygon",
                        "id": 54059,
                        "arcs": [[5098, 5099, 5100, 5101, 5102, -4803, -4833, -5062]]
                    }, {
                        "type": "Polygon",
                        "id": 21101,
                        "arcs": [[-4974, -4925, 5103, 5104, 5105, 5106, -4928, -4975]]
                    }, {
                        "type": "Polygon",
                        "id": 51097,
                        "arcs": [[-4982, 5107, 5108, 5109, 5110, -4919]]
                    }, {
                        "type": "Polygon",
                        "id": 8111,
                        "arcs": [[-4997, 5111, 5112, -4984, -4846]]
                    }, {
                        "type": "Polygon",
                        "id": 21167,
                        "arcs": [[-5084, 5113, 5114, 5115, -4998, -4959]]
                    }, {
                        "type": "Polygon",
                        "id": 8079,
                        "arcs": [[5116, 5117, -4994, -4780]]
                    }, {
                        "type": "Polygon",
                        "id": 21159,
                        "arcs": [[-4804, -5103, 5118, 5119, -5085, -4872]]
                    }, {
                        "type": "Polygon",
                        "id": 51005,
                        "arcs": [[-5029, 5120, 5121, 5122, -4883, -4877]]
                    }, {
                        "type": "Polygon",
                        "id": 17077,
                        "arcs": [[-5003, 5123, 5124, 5125, -4935, -4943]]
                    }, {
                        "type": "Polygon",
                        "id": 21197,
                        "arcs": [[-5044, 5126, 5127, 5128, -5015, -4962]]
                    }, {
                        "type": "Polygon",
                        "id": 21059,
                        "arcs": [[5129, 5130, -5104, -4924, -4955, -5092]]
                    }, {
                        "type": "Polygon",
                        "id": 21151,
                        "arcs": [[5131, 5132, 5133, 5134, -5082, -4949, -5017]]
                    }, {
                        "type": "Polygon",
                        "id": 17059,
                        "arcs": [[-4930, 5135, 5136, 5137, -4915, -4907]]
                    }, {
                        "type": "Polygon",
                        "id": 21229,
                        "arcs": [[-5116, 5138, 5139, -5096, -4999]]
                    }, {
                        "type": "Polygon",
                        "id": 20057,
                        "arcs": [[-5025, 5140, 5141, 5142, -5088, -4913]]
                    }, {
                        "type": "Polygon",
                        "id": 20173,
                        "arcs": [[-5022, 5143, 5144, -4971, -4965]]
                    }, {
                        "type": "Polygon",
                        "id": 17165,
                        "arcs": [[-5138, 5145, 5146, 5147, -5001, -4916]]
                    }, {
                        "type": "Polygon",
                        "id": 51101,
                        "arcs": [[-5111, 5148, 5149, -5070, -4920]]
                    }, {
                        "type": "Polygon",
                        "id": 29059,
                        "arcs": [[-4870, 5150, 5151, 5152, 5153, -5037]]
                    }, {
                        "type": "Polygon",
                        "id": 6001,
                        "arcs": [[-4852, -5036, 5154, 5155, -5018]]
                    }, {
                        "type": "Polygon",
                        "id": 51075,
                        "arcs": [[5156, 5157, 5158, -5076, -4987, -5073]]
                    }, {
                        "type": "Polygon",
                        "id": 29157,
                        "arcs": [[-5126, 5159, 5160, 5161, 5162, -5031, -5007, -4936]]
                    }, {
                        "type": "Polygon",
                        "id": 29039,
                        "arcs": [[5163, 5164, 5165, -5039, -4940]]
                    }, {
                        "type": "Polygon",
                        "id": 6043,
                        "arcs": [[5166, 5167, -4787]]
                    }, {
                        "type": "Polygon",
                        "id": 21225,
                        "arcs": [[5168, 5169, 5170, -5136, -4929, -5107]]
                    }, {
                        "type": "Polygon",
                        "id": 29105,
                        "arcs": [[-5066, 5171, 5172, 5173, -5151, -4869]]
                    }, {
                        "type": "Polygon",
                        "id": 8033,
                        "arcs": [[-5113, 5174, -4750, -4985]]
                    }, {
                        "type": "Polygon",
                        "id": 21153,
                        "arcs": [[-5087, 5175, 5176, 5177, 5178, -5012]]
                    }, {
                        "type": "Polygon",
                        "id": 54089,
                        "arcs": [[5179, 5180, -5093, -4897, -4885, 5181]]
                    }, {
                        "type": "Polygon",
                        "id": 17199,
                        "arcs": [[-5148, 5182, 5183, -5124, -5002]]
                    }, {
                        "type": "Polygon",
                        "id": 21237,
                        "arcs": [[-5179, 5184, 5185, -5127, -5043, -5013]]
                    }, {
                        "type": "Polygon",
                        "id": 21065,
                        "arcs": [[-5129, 5186, 5187, -5132, -5016]]
                    }, {
                        "type": "Polygon",
                        "id": 51103,
                        "arcs": [[-5005, -5063, 5188]]
                    }, {
                        "type": "Polygon",
                        "id": 8105,
                        "arcs": [[-4779, 5189, 5190, 5191, -5117]]
                    }, {
                        "type": "Polygon",
                        "id": 6075,
                        "arcs": [[5192, 5193]]
                    }, {
                        "type": "Polygon",
                        "id": 29167,
                        "arcs": [[-5038, -5154, 5194, 5195, -5164, -4939]]
                    }, {
                        "type": "Polygon",
                        "id": 21079,
                        "arcs": [[-5135, 5196, 5197, 5198, -5114, -5083]]
                    }, {
                        "type": "Polygon",
                        "id": 20151,
                        "arcs": [[-4973, 5199, 5200, 5201, -5023, -4910]]
                    }, {
                        "type": "Polygon",
                        "id": 51009,
                        "arcs": [[5202, 5203, 5204, 5205, -5026, -5047]]
                    }, {
                        "type": "Polygon",
                        "id": 8071,
                        "arcs": [[-4890, 5206, 5207, 5208, 5209, -5067, -4719, -4892]]
                    }, {
                        "type": "Polygon",
                        "id": 51023,
                        "arcs": [[5210, 5211, 5212, -5121, -5028]]
                    }, {
                        "type": "Polygon",
                        "id": 29065,
                        "arcs": [[-4946, 5213, 5214, 5215, 5216, -4976]]
                    }, {
                        "type": "Polygon",
                        "id": 54109,
                        "arcs": [[5217, 5218, -5099, -5061, -4932, -5095]]
                    }, {
                        "type": "Polygon",
                        "id": 51029,
                        "arcs": [[5219, 5220, 5221, -5045, -4862, -5075]]
                    }, {
                        "type": "Polygon",
                        "id": 6039,
                        "arcs": [[-4572, 5222, 5223, -5167, -4786]]
                    }, {
                        "type": "Polygon",
                        "id": 51119,
                        "arcs": [[5224, -5108, -4981, 5225]]
                    }, {
                        "type": "Polygon",
                        "id": 21071,
                        "arcs": [[-5120, 5226, 5227, -5176, -5086]]
                    }, {
                        "type": "Polygon",
                        "id": 8003,
                        "arcs": [[-5069, 5228, 5229, -5190, -4778]]
                    }, {
                        "type": "Polygon",
                        "id": 51049,
                        "arcs": [[-5159, 5230, 5231, 5232, -5220, -5074]]
                    }, {
                        "type": "Polygon",
                        "id": 21195,
                        "arcs": [[5233, 5234, 5235, 5236, 5237, -5227, -5119, -5102]]
                    }, {
                        "type": "Polygon",
                        "id": 29093,
                        "arcs": [[-5033, 5238, 5239, 5240, -5214, -4945, -4953]]
                    }, {
                        "type": "Polygon",
                        "id": 20187,
                        "arcs": [[5241, 5242, 5243, 5244, -4880, -4905]]
                    }, {
                        "type": "Polygon",
                        "id": 21183,
                        "arcs": [[-5050, 5245, 5246, 5247, 5248, -5130, -5091]]
                    }, {
                        "type": "Polygon",
                        "id": 20067,
                        "arcs": [[5249, 5250, -5242, -4900]]
                    }, {
                        "type": "Polygon",
                        "id": 20081,
                        "arcs": [[-5090, 5251, 5252, 5253, -5250, -4904]]
                    }, {
                        "type": "Polygon",
                        "id": 20097,
                        "arcs": [[-5202, 5254, 5255, 5256, -5141, -5024]]
                    }, {
                        "type": "Polygon",
                        "id": 20095,
                        "arcs": [[-5145, 5257, 5258, 5259, -5200, -4972]]
                    }, {
                        "type": "Polygon",
                        "id": 20205,
                        "arcs": [[5260, 5261, 5262, -4968, -5053]]
                    }, {
                        "type": "Polygon",
                        "id": 20133,
                        "arcs": [[-5057, 5263, 5264, 5265, -5261, -5055]]
                    }, {
                        "type": "Polygon",
                        "id": 21123,
                        "arcs": [[5266, 5267, 5268, 5269, -5078, -5098]]
                    }, {
                        "type": "Polygon",
                        "id": 21155,
                        "arcs": [[-5140, 5270, 5271, 5272, -5267, -5097]]
                    }, {
                        "type": "Polygon",
                        "id": 54063,
                        "arcs": [[-5123, 5273, 5274, -5182, -4884]]
                    }, {
                        "type": "Polygon",
                        "id": 21129,
                        "arcs": [[-5186, 5275, 5276, 5277, -5187, -5128]]
                    }, {
                        "type": "Polygon",
                        "id": 21021,
                        "arcs": [[-5199, 5278, 5279, -5271, -5139, -5115]]
                    }, {
                        "type": "Polygon",
                        "id": 51087,
                        "arcs": [[5280, 5281, 5282, 5283, 5284, 5285, 5286, 5287, -5157, -5072]]
                    }, {
                        "type": "Polygon",
                        "id": 6081,
                        "arcs": [[5288, 5289, 5290, 5291, -5193]]
                    }, {
                        "type": "Polygon",
                        "id": 21025,
                        "arcs": [[-5178, 5292, 5293, 5294, -5276, -5185]]
                    }, {
                        "type": "Polygon",
                        "id": 51145,
                        "arcs": [[5295, 5296, -5231, -5158]]
                    }, {
                        "type": "Polygon",
                        "id": 21149,
                        "arcs": [[-5249, 5297, 5298, 5299, -5105, -5131]]
                    }, {
                        "type": "Polygon",
                        "id": 20037,
                        "arcs": [[-5041, 5300, 5301, 5302, 5303, -5264, -5056]]
                    }, {
                        "type": "Polygon",
                        "id": 51045,
                        "arcs": [[5304, 5305, 5306, -5274, -5122, -5213]]
                    }, {
                        "type": "Polygon",
                        "id": 8023,
                        "arcs": [[-5210, 5307, 5308, 5309, -5229, -5068]]
                    }, {
                        "type": "Polygon",
                        "id": 29011,
                        "arcs": [[-5166, 5310, 5311, -5301, -5040]]
                    }, {
                        "type": "Polygon",
                        "id": 21233,
                        "arcs": [[5312, 5313, 5314, -5169, -5106, -5300]]
                    }, {
                        "type": "Polygon",
                        "id": 29123,
                        "arcs": [[-5163, 5315, 5316, -5239, -5032]]
                    }, {
                        "type": "Polygon",
                        "id": 8009,
                        "arcs": [[-5245, 5317, 5318, 5319, -5207, -4889, -4881]]
                    }, {
                        "type": "Polygon",
                        "id": 8083,
                        "arcs": [[5320, 5321, -4751, -5175]]
                    }, {
                        "type": "Polygon",
                        "id": 8067,
                        "arcs": [[-4996, 5322, 5323, -5321, -5112]]
                    }, {
                        "type": "Polygon",
                        "id": 6047,
                        "arcs": [[-5224, 5324, 5325, 5326, -5034, -5168]]
                    }, {
                        "type": "Polygon",
                        "id": 21137,
                        "arcs": [[5327, 5328, 5329, -5279, -5198]]
                    }, {
                        "type": "Polygon",
                        "id": 51127,
                        "arcs": [[5330, 5331, 5332, -5281, -5071, -5150]]
                    }, {
                        "type": "Polygon",
                        "id": 21085,
                        "arcs": [[-5081, -5080, 5333, 5334, 5335, -5246, -5049]]
                    }, {
                        "type": "Polygon",
                        "id": 51019,
                        "arcs": [[5336, 5337, 5338, 5339, 5340, -5211, -5027, -5206]]
                    }, {
                        "type": "Polygon",
                        "id": 49053,
                        "arcs": [[5341, 5342, -4624, -4990]]
                    }, {
                        "type": "Polygon",
                        "id": 20049,
                        "arcs": [[-5263, 5343, 5344, 5345, -5020, -4969]]
                    }, {
                        "type": "Polygon",
                        "id": 29179,
                        "arcs": [[5346, 5347, 5348, -5215, -5241]]
                    }, {
                        "type": "Polygon",
                        "id": 29031,
                        "arcs": [[5349, 5350, 5351, 5352, 5353, -5161]]
                    }, {
                        "type": "Polygon",
                        "id": 29215,
                        "arcs": [[-4977, -5217, 5354, 5355, 5356, 5357, -5172, -5065]]
                    }, {
                        "type": "Polygon",
                        "id": 17069,
                        "arcs": [[-5137, -5171, 5358, 5359, 5360, -5146]]
                    }, {
                        "type": "Polygon",
                        "id": 17151,
                        "arcs": [[-5361, 5361, 5362, 5363, -5147]]
                    }, {
                        "type": "Polygon",
                        "id": 51760,
                        "arcs": [[-5285, 5364, -5287, -5286]]
                    }, {
                        "type": "Polygon",
                        "id": 17087,
                        "arcs": [[-5364, 5365, 5366, 5367, -5183]]
                    }, {
                        "type": "Polygon",
                        "id": 17181,
                        "arcs": [[-5184, -5368, 5368, 5369, -5350, -5160, -5125]]
                    }, {
                        "type": "Polygon",
                        "id": 51073,
                        "arcs": [[5370, 5371, 5372, -5109, -5225]]
                    }, {
                        "type": "Polygon",
                        "id": 29017,
                        "arcs": [[-5354, 5373, 5374, -5316, -5162]]
                    }, {
                        "type": "Polygon",
                        "id": 54055,
                        "arcs": [[-5181, 5375, 5376, 5377, 5378, -5218, -5094]]
                    }, {
                        "type": "Polygon",
                        "id": 6019,
                        "arcs": [[5379, 5380, 5381, 5382, 5383, -5325, -5223, -4571]]
                    }, {
                        "type": "Polygon",
                        "id": 29057,
                        "arcs": [[-5196, 5384, 5385, 5386, -5311, -5165]]
                    }, {
                        "type": "Polygon",
                        "id": 21109,
                        "arcs": [[-5278, 5387, 5388, 5389, 5390, -5133, -5188]]
                    }, {
                        "type": "Polygon",
                        "id": 21107,
                        "arcs": [[5391, 5392, 5393, -5313, -5299]]
                    }, {
                        "type": "Polygon",
                        "id": 51041,
                        "arcs": [[-5365, -5284, 5394, 5395, 5396, 5397, 5398, 5399, 5400, 5401, -5296, -5288]]
                    }, {
                        "type": "Polygon",
                        "id": 51011,
                        "arcs": [[5402, 5403, 5404, -5203, -5046, -5222]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 51131,
                        "arcs": [[[5405, -5058]]]
                    }, {
                        "type": "Polygon",
                        "id": 21045,
                        "arcs": [[-5330, 5406, 5407, 5408, 5409, -5272, -5280]]
                    }, {
                        "type": "Polygon",
                        "id": 54047,
                        "arcs": [[-5379, 5410, 5411, -5100, -5219]]
                    }, {
                        "type": "Polygon",
                        "id": 21055,
                        "arcs": [[-5315, 5412, 5413, 5414, -5359, -5170]]
                    }, {
                        "type": "Polygon",
                        "id": 49025,
                        "arcs": [[-4979, -4755, 5415, 5416, -5342, -4989]]
                    }, {
                        "type": "Polygon",
                        "id": 21189,
                        "arcs": [[-5295, 5417, 5418, -5388, -5277]]
                    }, {
                        "type": "Polygon",
                        "id": 21203,
                        "arcs": [[-5391, 5419, 5420, -5328, -5197, -5134]]
                    }, {
                        "type": "Polygon",
                        "id": 51027,
                        "arcs": [[-5412, 5421, 5422, 5423, -5234, -5101]]
                    }, {
                        "type": "Polygon",
                        "id": 51115,
                        "arcs": [[-5372, 5424]]
                    }, {
                        "type": "Polygon",
                        "id": 21119,
                        "arcs": [[-5177, -5228, -5238, 5425, 5426, -5293]]
                    }, {
                        "type": "Polygon",
                        "id": 51007,
                        "arcs": [[-5402, 5427, 5428, 5429, -5232, -5297]]
                    }, {
                        "type": "Polygon",
                        "id": 51036,
                        "arcs": [[5430, 5431, -5282, -5333]]
                    }, {
                        "type": "Polygon",
                        "id": 29225,
                        "arcs": [[-5174, 5432, 5433, 5434, 5435, -5152]]
                    }, {
                        "type": "Polygon",
                        "id": 6085,
                        "arcs": [[-5035, -5327, 5436, 5437, -5290, 5438, -5155]]
                    }, {
                        "type": "Polygon",
                        "id": 21217,
                        "arcs": [[-5273, -5410, 5439, 5440, -5268]]
                    }, {
                        "type": "Polygon",
                        "id": 29229,
                        "arcs": [[-5358, 5441, -5433, -5173]]
                    }, {
                        "type": "Polygon",
                        "id": 51071,
                        "arcs": [[-5307, 5442, 5443, 5444, -5376, -5180, -5275]]
                    }, {
                        "type": "Polygon",
                        "id": 20035,
                        "arcs": [[-5346, 5445, 5446, 5447, 5448, -5021]]
                    }, {
                        "type": "Polygon",
                        "id": 20191,
                        "arcs": [[-5449, 5449, 5450, 5451, -5258, -5144]]
                    }, {
                        "type": "Polygon",
                        "id": 20119,
                        "arcs": [[-5143, 5452, 5453, 5454, -5252, -5089]]
                    }, {
                        "type": "Polygon",
                        "id": 20025,
                        "arcs": [[-5257, 5455, 5456, 5457, -5453, -5142]]
                    }, {
                        "type": "Polygon",
                        "id": 20007,
                        "arcs": [[-5260, 5458, 5459, 5460, 5461, -5255, -5201]]
                    }, {
                        "type": "Polygon",
                        "id": 21087,
                        "arcs": [[-5441, 5462, 5463, 5464, -5269]]
                    }, {
                        "type": "Polygon",
                        "id": 51680,
                        "arcs": [[-5205, 5465, -5337]]
                    }, {
                        "type": "Polygon",
                        "id": 6027,
                        "arcs": [[-4773, -4255, 5466, 5467, 5468, 5469, -5380, -4570]]
                    }, {
                        "type": "Polygon",
                        "id": 51095,
                        "arcs": [[5470, 5471, 5472, -5431, -5332, 5473, 5474, 5475]]
                    }, {
                        "type": "Polygon",
                        "id": 21099,
                        "arcs": [[-5270, -5465, 5476, 5477, 5478, -5334, -5079]]
                    }, {
                        "type": "Polygon",
                        "id": 21193,
                        "arcs": [[-5427, 5479, 5480, 5481, 5482, -5418, -5294]]
                    }, {
                        "type": "Polygon",
                        "id": 51031,
                        "arcs": [[-5405, 5483, 5484, 5485, -5338, -5466, -5204]]
                    }, {
                        "type": "Polygon",
                        "id": 29077,
                        "arcs": [[-5153, -5436, 5486, 5487, -5385, -5195]]
                    }, {
                        "type": "Polygon",
                        "id": 21139,
                        "arcs": [[-5415, 5488, 5489, 5490, 5491, -5362, -5360]]
                    }, {
                        "type": "Polygon",
                        "id": 29203,
                        "arcs": [[-5349, 5492, 5493, 5494, -5355, -5216]]
                    }, {
                        "type": "Polygon",
                        "id": 8007,
                        "arcs": [[-5118, -5192, 5495, 5496, 5497, -5323, -4995]]
                    }, {
                        "type": "Polygon",
                        "id": 51161,
                        "arcs": [[-5341, 5498, 5499, 5500, -5305, -5212], [5501, 5502]]
                    }, {
                        "type": "Polygon",
                        "id": 21177,
                        "arcs": [[5503, 5504, 5505, 5506, -5392, -5298, -5248]]
                    }, {
                        "type": "Polygon",
                        "id": 51147,
                        "arcs": [[-5233, -5430, 5507, 5508, 5509, -5403, -5221]]
                    }, {
                        "type": "Polygon",
                        "id": 8021,
                        "arcs": [[-5191, -5230, -5310, 5510, 5511, -5496]]
                    }, {
                        "type": "Polygon",
                        "id": 21031,
                        "arcs": [[5512, 5513, -5504, -5247, -5336, 5514]]
                    }, {
                        "type": "Polygon",
                        "id": 20129,
                        "arcs": [[5515, 5516, 5517, -5318, -5244]]
                    }, {
                        "type": "Polygon",
                        "id": 20189,
                        "arcs": [[-5254, 5518, 5519, -5516, -5243, -5251]]
                    }, {
                        "type": "Polygon",
                        "id": 20175,
                        "arcs": [[-5455, 5520, 5521, -5519, -5253]]
                    }, {
                        "type": "Polygon",
                        "id": 20125,
                        "arcs": [[-5262, -5266, 5522, 5523, 5524, 5525, -5344]]
                    }, {
                        "type": "Polygon",
                        "id": 20077,
                        "arcs": [[5526, 5527, -5459, -5259, -5452]]
                    }, {
                        "type": "Polygon",
                        "id": 20033,
                        "arcs": [[5528, 5529, -5456, -5256, -5462]]
                    }, {
                        "type": "Polygon",
                        "id": 20099,
                        "arcs": [[-5304, 5530, 5531, 5532, -5523, -5265]]
                    }, {
                        "type": "Polygon",
                        "id": 21033,
                        "arcs": [[-5394, 5533, 5534, 5535, -5413, -5314]]
                    }, {
                        "type": "Polygon",
                        "id": 51199,
                        "arcs": [[5536, 5537, 5538, 5539, -5471, 5540, -5475]]
                    }, {
                        "type": "Polygon",
                        "id": 29097,
                        "arcs": [[-5387, 5541, 5542, 5543, -5302, -5312]]
                    }, {
                        "type": "Polygon",
                        "id": 51121,
                        "arcs": [[5544, 5545, 5546, 5547, -5443, -5306, -5501]]
                    }, {
                        "type": "Polygon",
                        "id": 21051,
                        "arcs": [[-5483, 5548, 5549, 5550, 5551, -5389, -5419]]
                    }, {
                        "type": "Polygon",
                        "id": 21199,
                        "arcs": [[5552, 5553, 5554, -5407, -5329, -5421, 5555]]
                    }, {
                        "type": "Polygon",
                        "id": 20021,
                        "arcs": [[-5544, 5556, 5557, 5558, -5531, -5303]]
                    }, {
                        "type": "Polygon",
                        "id": 21061,
                        "arcs": [[-5479, 5559, 5560, -5515, -5335]]
                    }, {
                        "type": "Polygon",
                        "id": 51770,
                        "arcs": [[5561, -5503]]
                    }, {
                        "type": "Polygon",
                        "id": 17127,
                        "arcs": [[-5492, 5562, 5563, -5366, -5363]]
                    }, {
                        "type": "Polygon",
                        "id": 51185,
                        "arcs": [[-5378, 5564, 5565, 5566, -5422, -5411]]
                    }, {
                        "type": "Polygon",
                        "id": 17003,
                        "arcs": [[5567, 5568, 5569, 5570, -5351, -5370]]
                    }, {
                        "type": "Polygon",
                        "id": 21125,
                        "arcs": [[-5552, 5571, 5572, 5573, -5556, -5420, -5390]]
                    }, {
                        "type": "Polygon",
                        "id": 17153,
                        "arcs": [[-5367, -5564, 5574, 5575, -5568, -5369]]
                    }, {
                        "type": "Polygon",
                        "id": 21131,
                        "arcs": [[5576, 5577, -5549, -5482]]
                    }, {
                        "type": "Polygon",
                        "id": 29223,
                        "arcs": [[-5375, 5578, 5579, 5580, -5347, -5240, -5317]]
                    }, {
                        "type": "Polygon",
                        "id": 51149,
                        "arcs": [[5581, 5582, 5583, 5584, 5585, -5397, 5586]]
                    }, {
                        "type": "Polygon",
                        "id": 21001,
                        "arcs": [[-5409, 5587, 5588, 5589, -5463, -5440]]
                    }, {
                        "type": "Polygon",
                        "id": 51051,
                        "arcs": [[5590, 5591, -5235, -5424]]
                    }, {
                        "type": "Polygon",
                        "id": 20019,
                        "arcs": [[-5526, 5592, 5593, -5446, -5345]]
                    }, {
                        "type": "Polygon",
                        "id": 51021,
                        "arcs": [[5594, 5595, 5596, -5565, -5377, -5445]]
                    }, {
                        "type": "Polygon",
                        "id": 51135,
                        "arcs": [[5597, 5598, -5508, -5429, 5599]]
                    }, {
                        "type": "Polygon",
                        "id": 29109,
                        "arcs": [[-5488, 5600, 5601, 5602, 5603, -5542, -5386]]
                    }, {
                        "type": "Polygon",
                        "id": 6087,
                        "arcs": [[5604, 5605, 5606, -5291, -5438]]
                    }, {
                        "type": "Polygon",
                        "id": 51053,
                        "arcs": [[5607, -5585, 5608, 5609, 5610, -5600, -5428, -5401]]
                    }, {
                        "type": "Polygon",
                        "id": 21133,
                        "arcs": [[-5237, 5611, 5612, -5480, -5426]]
                    }, {
                        "type": "Polygon",
                        "id": 29201,
                        "arcs": [[5613, 5614, 5615, -5352, -5571]]
                    }, {
                        "type": "Polygon",
                        "id": 51037,
                        "arcs": [[5616, 5617, 5618, -5484, -5404, -5510]]
                    }, {
                        "type": "Polygon",
                        "id": 51155,
                        "arcs": [[5619, -5546, 5620, 5621, 5622, -5595, -5444, -5548]]
                    }, {
                        "type": "Polygon",
                        "id": 51181,
                        "arcs": [[5623, 5624, 5625, -5583, 5626]]
                    }, {
                        "type": "Polygon",
                        "id": 51067,
                        "arcs": [[5627, 5628, 5629, 5630, -5499, -5340]]
                    }, {
                        "type": "Polygon",
                        "id": 21007,
                        "arcs": [[5631, 5632, -5569, -5576, 5633]]
                    }, {
                        "type": "Polygon",
                        "id": 21145,
                        "arcs": [[-5491, 5634, 5635, 5636, -5634, -5575, -5563]]
                    }, {
                        "type": "Polygon",
                        "id": 51700,
                        "arcs": [[5637, 5638, -5472, -5540]]
                    }, {
                        "type": "Polygon",
                        "id": 51195,
                        "arcs": [[5639, 5640, 5641, 5642, -5612, -5236, -5592]]
                    }, {
                        "type": "Polygon",
                        "id": 21227,
                        "arcs": [[-5561, 5643, 5644, 5645, 5646, -5513]]
                    }, {
                        "type": "Polygon",
                        "id": 21207,
                        "arcs": [[-5555, 5647, 5648, 5649, -5588, -5408]]
                    }, {
                        "type": "Polygon",
                        "id": 21169,
                        "arcs": [[-5590, 5650, 5651, 5652, -5477, -5464]]
                    }, {
                        "type": "Polygon",
                        "id": 21143,
                        "arcs": [[-5536, 5653, 5654, -5489, -5414]]
                    }, {
                        "type": "Polygon",
                        "id": 21009,
                        "arcs": [[5655, 5656, -5644, -5560, -5478, -5653]]
                    }, {
                        "type": "Polygon",
                        "id": 21047,
                        "arcs": [[-5507, 5657, 5658, 5659, 5660, -5534, -5393]]
                    }, {
                        "type": "Polygon",
                        "id": 51093,
                        "arcs": [[5661, 5662, 5663, 5664, -5624, 5665]]
                    }, {
                        "type": "Polygon",
                        "id": 51167,
                        "arcs": [[5666, 5667, 5668, -5640, -5591, -5423, -5567]]
                    }, {
                        "type": "Polygon",
                        "id": 51143,
                        "arcs": [[5669, 5670, 5671, 5672, 5673, 5674, -5628, -5339, -5486]]
                    }, {
                        "type": "Polygon",
                        "id": 51063,
                        "arcs": [[-5631, 5675, 5676, -5621, -5545, -5500]]
                    }, {
                        "type": "Polygon",
                        "id": 29207,
                        "arcs": [[-5353, -5616, 5677, 5678, 5679, -5579, -5374]]
                    }, {
                        "type": "Polygon",
                        "id": 51111,
                        "arcs": [[-5599, 5680, 5681, -5617, -5509]]
                    }, {
                        "type": "Polygon",
                        "id": 51650,
                        "arcs": [[-5638, -5539, -5683, 5683]]
                    }, {
                        "type": "Polygon",
                        "id": 51183,
                        "arcs": [[5684, 5685, -5609, -5584, -5626]]
                    }, {
                        "type": "Polygon",
                        "id": 29035,
                        "arcs": [[-5581, 5686, 5687, 5688, -5493, -5348]]
                    }, {
                        "type": "Polygon",
                        "id": 29043,
                        "arcs": [[-5435, 5689, 5690, 5691, -5601, -5487]]
                    }, {
                        "type": "Polygon",
                        "id": 51197,
                        "arcs": [[5692, 5693, 5694, -5596, -5623]]
                    }, {
                        "type": "Polygon",
                        "id": 21141,
                        "arcs": [[5695, 5696, 5697, -5505, -5514, -5647]]
                    }, {
                        "type": "Polygon",
                        "id": 21219,
                        "arcs": [[-5698, 5698, 5699, -5658, -5506]]
                    }, {
                        "type": "Polygon",
                        "id": 29067,
                        "arcs": [[-5442, -5357, 5700, 5701, 5702, -5690, -5434]]
                    }, {
                        "type": "Polygon",
                        "id": 21157,
                        "arcs": [[-5655, 5703, 5704, 5705, -5635, -5490]]
                    }, {
                        "type": "Polygon",
                        "id": 29133,
                        "arcs": [[-5633, 5706, 5707, 5708, 5709, -5614, -5570]]
                    }, {
                        "type": "Polygon",
                        "id": 51083,
                        "arcs": [[-5619, 5710, 5711, 5712, 5713, -5670, -5485]]
                    }, {
                        "type": "Polygon",
                        "id": 29091,
                        "arcs": [[-5495, 5714, 5715, 5716, -5701, -5356]]
                    }, {
                        "type": "Polygon",
                        "id": 29145,
                        "arcs": [[-5604, 5717, 5718, 5719, -5557, -5543]]
                    }, {
                        "type": "Polygon",
                        "id": 21121,
                        "arcs": [[5720, 5721, -5572, -5551]]
                    }, {
                        "type": "Polygon",
                        "id": 51025,
                        "arcs": [[-5611, 5722, 5723, 5724, 5725, -5681, -5598]]
                    }, {
                        "type": "Polygon",
                        "id": 21095,
                        "arcs": [[-5613, -5643, 5726, 5727, -5577, -5481]]
                    }, {
                        "type": "Polygon",
                        "id": 51173,
                        "arcs": [[-5597, -5695, 5728, 5729, -5667, -5566]]
                    }, {
                        "type": "Polygon",
                        "id": 4017,
                        "arcs": [[5730, 5731, 5732, 5733, -4753]]
                    }, {
                        "type": "Polygon",
                        "id": 4005,
                        "arcs": [[-5734, 5734, 5735, 5736, -5416, -4754]]
                    }, {
                        "type": "Polygon",
                        "id": 21221,
                        "arcs": [[5737, 5738, -5704, -5654, -5535, -5661]]
                    }, {
                        "type": "Polygon",
                        "id": 40105,
                        "arcs": [[-5533, 5739, 5740, 5741, -5524]]
                    }, {
                        "type": "Polygon",
                        "id": 40113,
                        "arcs": [[5742, 5743, 5744, 5745, 5746, -5447, -5594]]
                    }, {
                        "type": "Polygon",
                        "id": 40151,
                        "arcs": [[-5461, 5747, 5748, 5749, 5750, 5751, -5529]]
                    }, {
                        "type": "Polygon",
                        "id": 40035,
                        "arcs": [[-5559, 5752, 5753, 5754, 5755, -5740, -5532]]
                    }, {
                        "type": "Polygon",
                        "id": 40147,
                        "arcs": [[-5742, 5756, 5757, -5743, -5593, -5525]]
                    }, {
                        "type": "Polygon",
                        "id": 40053,
                        "arcs": [[5758, 5759, 5760, -5527, -5451]]
                    }, {
                        "type": "Polygon",
                        "id": 40003,
                        "arcs": [[-5528, -5761, 5761, 5762, -5748, -5460]]
                    }, {
                        "type": "Polygon",
                        "id": 40071,
                        "arcs": [[-5747, 5763, 5764, -5759, -5450, -5448]]
                    }, {
                        "type": "Polygon",
                        "id": 40115,
                        "arcs": [[-5720, 5765, 5766, -5753, -5558]]
                    }, {
                        "type": "Polygon",
                        "id": 40059,
                        "arcs": [[-5530, -5752, -5751, 5767, 5768, 5769, -5457]]
                    }, {
                        "type": "Polygon",
                        "id": 35039,
                        "arcs": [[-5512, 5770, 5771, 5772, 5773, 5774, 5775, -5497]]
                    }, {
                        "type": "Polygon",
                        "id": 35045,
                        "arcs": [[-5776, 5776, 5777, 5778, -5322, -5324, -5498]]
                    }, {
                        "type": "Polygon",
                        "id": 4001,
                        "arcs": [[-5779, 5779, 5780, 5781, 5782, 5783, -5731, -4752]]
                    }, {
                        "type": "Polygon",
                        "id": 35059,
                        "arcs": [[5784, 5785, 5786, 5787, 5788, 5789, -5208, -5320]]
                    }, {
                        "type": "Polygon",
                        "id": 40025,
                        "arcs": [[-5518, 5790, 5791, 5792, -5785, -5319]]
                    }, {
                        "type": "Polygon",
                        "id": 40139,
                        "arcs": [[5793, 5794, 5795, 5796, -5791, -5517, -5520, -5522]]
                    }, {
                        "type": "Polygon",
                        "id": 40007,
                        "arcs": [[-5458, -5770, 5797, 5798, 5799, -5794, -5521, -5454]]
                    }, {
                        "type": "Polygon",
                        "id": 51175,
                        "arcs": [[5800, -5663, 5801, 5802, 5803, 5804, 5805, -5685, -5625, -5665]]
                    }, {
                        "type": "Polygon",
                        "id": 21231,
                        "arcs": [[5806, 5807, 5808, 5809, -5648, -5554]]
                    }, {
                        "type": "Polygon",
                        "id": 35055,
                        "arcs": [[5810, 5811, -5771, -5511, -5309]]
                    }, {
                        "type": "Polygon",
                        "id": 35007,
                        "arcs": [[-5790, 5812, 5813, -5811, -5308, -5209]]
                    }, {
                        "type": "Polygon",
                        "id": 29209,
                        "arcs": [[5814, 5815, 5816, -5602, -5692]]
                    }, {
                        "type": "Polygon",
                        "id": 6069,
                        "arcs": [[-5326, -5384, 5817, -5605, -5437]]
                    }, {
                        "type": "Polygon",
                        "id": 21235,
                        "arcs": [[-5722, 5818, 5819, 5820, 5821, -5573]]
                    }, {
                        "type": "Polygon",
                        "id": 51710,
                        "arcs": [[5822, 5823]]
                    }, {
                        "type": "Polygon",
                        "id": 21147,
                        "arcs": [[-5822, 5824, 5825, -5807, -5553, -5574]]
                    }, {
                        "type": "Polygon",
                        "id": 21013,
                        "arcs": [[-5578, -5728, 5826, 5827, -5819, -5721, -5550]]
                    }, {
                        "type": "Polygon",
                        "id": 21039,
                        "arcs": [[-5637, 5828, 5829, -5707, -5632]]
                    }, {
                        "type": "Polygon",
                        "id": 21083,
                        "arcs": [[-5706, 5830, 5831, 5832, 5833, -5829, -5636]]
                    }, {
                        "type": "Polygon",
                        "id": 21057,
                        "arcs": [[5834, 5835, 5836, -5651, -5589, -5650]]
                    }, {
                        "type": "Polygon",
                        "id": 21003,
                        "arcs": [[-5657, 5837, 5838, 5839, 5840, -5645]]
                    }, {
                        "type": "Polygon",
                        "id": 29009,
                        "arcs": [[-5817, 5841, 5842, 5843, -5718, -5603]]
                    }, {
                        "type": "Polygon",
                        "id": 51810,
                        "arcs": [[5844, 5845, 5846, 5847, 5848, 5849, 5850, -5823, 5851]]
                    }, {
                        "type": "Polygon",
                        "id": 51035,
                        "arcs": [[5852, 5853, 5854, 5855, 5856, -5693, -5622, -5677]]
                    }, {
                        "type": "Polygon",
                        "id": 51191,
                        "arcs": [[5857, 5858, 5859, -5668, -5730, 5860, 5861, 5862, 5863]]
                    }, {
                        "type": "Polygon",
                        "id": 29023,
                        "arcs": [[-5680, 5864, 5865, 5866, -5687, -5580]]
                    }, {
                        "type": "Polygon",
                        "id": 51800,
                        "arcs": [[-5868, 5868, 5869, 5870, -5802, -5662, 5871]]
                    }, {
                        "type": "Polygon",
                        "id": 6053,
                        "arcs": [[-5818, -5383, 5872, 5873, 5874, -5606]]
                    }, {
                        "type": "Polygon",
                        "id": 51081,
                        "arcs": [[-5686, -5806, 5875, -5723, -5610]]
                    }, {
                        "type": "Polygon",
                        "id": 51105,
                        "arcs": [[5876, 5877, 5878, -5827, -5727, -5642]]
                    }, {
                        "type": "Polygon",
                        "id": 51117,
                        "arcs": [[-5726, 5879, 5880, 5881, -5711, -5618, -5682]]
                    }, {
                        "type": "Polygon",
                        "id": 21053,
                        "arcs": [[-5810, 5882, 5883, -5835, -5649]]
                    }, {
                        "type": "Polygon",
                        "id": 29149,
                        "arcs": [[-5689, 5884, 5885, 5886, 5887, -5715, -5494]]
                    }, {
                        "type": "Polygon",
                        "id": 51169,
                        "arcs": [[-5669, -5860, 5888, 5889, 5890, -5877, -5641]]
                    }, {
                        "type": "Polygon",
                        "id": 21213,
                        "arcs": [[5891, 5892, -5696, -5646, -5841]]
                    }, {
                        "type": "Polygon",
                        "id": 51141,
                        "arcs": [[5893, 5894, 5895, -5853, -5676, -5630]]
                    }, {
                        "type": "Polygon",
                        "id": 29143,
                        "arcs": [[-5710, 5896, 5897, 5898, 5899, 5900, 5901, -5678, -5615]]
                    }, {
                        "type": "Polygon",
                        "id": 51550,
                        "arcs": [[5902, -5904, 5904, 5905, -5850, 5906, 5907, -5869, -5909]]
                    }, {
                        "type": "Polygon",
                        "id": 51089,
                        "arcs": [[5909, 5910, -5894, -5629, -5675]]
                    }, {
                        "type": "Polygon",
                        "id": 32003,
                        "arcs": [[5911, 5912, -5467, -4254, -4626]]
                    }, {
                        "type": "Polygon",
                        "id": 21171,
                        "arcs": [[-5837, 5913, 5914, -5838, -5656, -5652]]
                    }, {
                        "type": "Polygon",
                        "id": 29181,
                        "arcs": [[-5867, 5915, 5916, -5885, -5688]]
                    }, {
                        "type": "Polygon",
                        "id": 29213,
                        "arcs": [[-5703, 5917, 5918, 5919, 5920, -5815, -5691]]
                    }, {
                        "type": "Polygon",
                        "id": 40153,
                        "arcs": [[5921, 5922, 5923, -5768, 5750, -5751, -5750]]
                    }, {
                        "type": "Polygon",
                        "id": 51077,
                        "arcs": [[-5857, 5924, -5855, 5925, 5926, 5927, 5928, -5861, -5729, -5694]]
                    }, {
                        "type": "Polygon",
                        "id": 29153,
                        "arcs": [[-5717, 5929, 5930, 5931, -5918, -5702]]
                    }, {
                        "type": "Polygon",
                        "id": 21105,
                        "arcs": [[-5834, 5932, 5933, 5934, -5708, -5830]]
                    }, {
                        "type": "Polygon",
                        "id": 29119,
                        "arcs": [[-5844, 5935, 5936, -5766, -5719]]
                    }, {
                        "type": "Polygon",
                        "id": 21035,
                        "arcs": [[-5739, 5937, 5938, -5831, -5705]]
                    }, {
                        "type": "Polygon",
                        "id": 6107,
                        "arcs": [[5939, 5940, -5381, -5470]]
                    }, {
                        "type": "Polygon",
                        "id": 47161,
                        "arcs": [[-5660, 5941, 5942, 5943, 5944, -5938, -5738]]
                    }, {
                        "type": "Polygon",
                        "id": 40041,
                        "arcs": [[-5937, 5945, 5946, 5947, 5948, -5754, -5767]]
                    }, {
                        "type": "Polygon",
                        "id": 47147,
                        "arcs": [[5949, 5950, 5951, -5699, -5697, -5893, 5952]]
                    }, {
                        "type": "Polygon",
                        "id": 47165,
                        "arcs": [[5953, 5954, 5955, 5956, -5953, -5892, -5840]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 21075,
                        "arcs": [[[5957, 5958, -5897, -5709, -5935]]]
                    }, {
                        "type": "Polygon",
                        "id": 47125,
                        "arcs": [[-5952, 5959, 5960, 5961, -5942, -5659, -5700]]
                    }, {
                        "type": "Polygon",
                        "id": 51590,
                        "arcs": [[5962, -5672]]
                    }, {
                        "type": "Polygon",
                        "id": 47111,
                        "arcs": [[5963, 5964, 5965, -5954, -5839, -5915, 5966]]
                    }, {
                        "type": "Polygon",
                        "id": 29069,
                        "arcs": [[-5902, 5967, 5968, 5969, 5970, 5971, 5972, -5865, -5679]]
                    }, {
                        "type": "Polygon",
                        "id": 47137,
                        "arcs": [[5973, 5974, 5975, 5976, -5883, -5809]]
                    }, {
                        "type": "Polygon",
                        "id": 47027,
                        "arcs": [[5977, 5978, -5967, -5914, -5836, -5884, -5977]]
                    }, {
                        "type": "Polygon",
                        "id": 47163,
                        "arcs": [[5979, 5980, 5981, -5889, -5859, -5983, -5863, 5983]]
                    }, {
                        "type": "Polygon",
                        "id": 47091,
                        "arcs": [[-5929, 5984, 5985, 5986, 5987, -5984, -5862]]
                    }, {
                        "type": "Polygon",
                        "id": 47151,
                        "arcs": [[5988, 5989, 5990, 5991, -5974, -5808, -5826]]
                    }, {
                        "type": "Polygon",
                        "id": 47025,
                        "arcs": [[5992, 5993, 5994, 5995, -5820, -5828, -5879]]
                    }, {
                        "type": "Polygon",
                        "id": 40103,
                        "arcs": [[5996, 5997, 5998, 5999, -5764, -5746]]
                    }, {
                        "type": "Polygon",
                        "id": 47067,
                        "arcs": [[-5891, 6000, 6001, -5993, -5878]]
                    }, {
                        "type": "Polygon",
                        "id": 40131,
                        "arcs": [[6002, 6003, 6004, -5757, -5741, -5756]]
                    }, {
                        "type": "Polygon",
                        "id": 47013,
                        "arcs": [[6005, 6006, -5989, -5825, -5821, -5996]]
                    }, {
                        "type": "Polygon",
                        "id": 47073,
                        "arcs": [[-5982, 6007, 6008, 6009, 6010, -6001, -5890]]
                    }, {
                        "type": "Polygon",
                        "id": 40047,
                        "arcs": [[-5765, -6000, 6011, 6012, 6013, -5762, -5760]]
                    }, {
                        "type": "Polygon",
                        "id": 40045,
                        "arcs": [[-5924, 6014, 6015, 6016, 6017, -5798, -5769]]
                    }, {
                        "type": "Polygon",
                        "id": 37009,
                        "arcs": [[6018, 6019, 6020, -5985, -5928]]
                    }, {
                        "type": "Polygon",
                        "id": 47049,
                        "arcs": [[-5992, 6021, 6022, 6023, 6024, -5975]]
                    }, {
                        "type": "Polygon",
                        "id": 37005,
                        "arcs": [[6025, 6026, -6019, -5927]]
                    }, {
                        "type": "Polygon",
                        "id": 40117,
                        "arcs": [[6027, 6028, 6029, -5997, -5745]]
                    }, {
                        "type": "Polygon",
                        "id": 37171,
                        "arcs": [[-5896, 6030, 6031, 6032, 6033, -6026, -5926, -5854]]
                    }, {
                        "type": "Polygon",
                        "id": 37073,
                        "arcs": [[6034, 6035, 6036, 6037, 6038, 6039, -5803, -5871]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 37053,
                        "arcs": [[[6040, -5907, -5849, 6041]], [[-5845, 6042, 6043, 6044]]]
                    }, {
                        "type": "Polygon",
                        "id": 37169,
                        "arcs": [[-5911, 6045, 6046, -6031, -5895]]
                    }, {
                        "type": "Polygon",
                        "id": 37029,
                        "arcs": [[-5870, -5908, -6041, 6047, 6048, -6035]]
                    }, {
                        "type": "Polygon",
                        "id": 37185,
                        "arcs": [[6049, 6050, 6051, 6052, -5880, -5725]]
                    }, {
                        "type": "Polygon",
                        "id": 37131,
                        "arcs": [[6053, 6054, -6050, -5724, -5876, -5805, 6055]]
                    }, {
                        "type": "Polygon",
                        "id": 37091,
                        "arcs": [[-6040, 6056, 6057, -6056, -5804]]
                    }, {
                        "type": "Polygon",
                        "id": 37145,
                        "arcs": [[6058, 6059, 6060, 6061, -5713]]
                    }, {
                        "type": "Polygon",
                        "id": 37181,
                        "arcs": [[-6053, 6062, 6063, -5881]]
                    }, {
                        "type": "Polygon",
                        "id": 37077,
                        "arcs": [[6064, 6065, 6066, -6059, -5712, -5882, -6064]]
                    }, {
                        "type": "Polygon",
                        "id": 37157,
                        "arcs": [[-5674, 6067, 6068, 6069, -6046, -5910]]
                    }, {
                        "type": "Polygon",
                        "id": 37033,
                        "arcs": [[-6062, 6070, 6071, -6068, -5673, -5963, -5671, -5714]]
                    }, {
                        "type": "Polygon",
                        "id": 47133,
                        "arcs": [[-6025, 6072, 6073, -5978, -5976]]
                    }, {
                        "type": "Polygon",
                        "id": 47087,
                        "arcs": [[-6074, 6074, 6075, -5964, -5979]]
                    }, {
                        "type": "Polygon",
                        "id": 37083,
                        "arcs": [[6076, 6077, 6078, 6079, -6051, -6055]]
                    }, {
                        "type": "Polygon",
                        "id": 40097,
                        "arcs": [[-5949, 6080, 6081, -6003, -5755]]
                    }, {
                        "type": "Polygon",
                        "id": 47019,
                        "arcs": [[6082, 6083, 6084, 6085, -5980, -5988]]
                    }, {
                        "type": "Polygon",
                        "id": 37139,
                        "arcs": [[6086, 6087, -6036, -6049]]
                    }, {
                        "type": "Polygon",
                        "id": 47131,
                        "arcs": [[-5934, 6088, 6089, 6090, 6091, -5958]]
                    }, {
                        "type": "Polygon",
                        "id": 40093,
                        "arcs": [[-5763, -6014, 6092, 6093, 6094, -5922, -5749]]
                    }, {
                        "type": "Polygon",
                        "id": 47183,
                        "arcs": [[6095, 6096, 6097, -6089, -5933, -5833]]
                    }, {
                        "type": "Polygon",
                        "id": 47095,
                        "arcs": [[6098, 6099, -5900, -6101, -5898, -5959, -6092]]
                    }, {
                        "type": "Polygon",
                        "id": 48421,
                        "arcs": [[6101, 6102, -5792, -5797, 6103]]
                    }, {
                        "type": "Polygon",
                        "id": 47079,
                        "arcs": [[-5945, 6104, 6105, -6096, -5832, -5939]]
                    }, {
                        "type": "Polygon",
                        "id": 48195,
                        "arcs": [[6106, 6107, -6104, -5796, 6108]]
                    }, {
                        "type": "Polygon",
                        "id": 48111,
                        "arcs": [[-5793, -6103, 6109, -5786]]
                    }, {
                        "type": "Polygon",
                        "id": 48357,
                        "arcs": [[6110, 6111, -6109, -5795, -5800]]
                    }, {
                        "type": "Polygon",
                        "id": 48295,
                        "arcs": [[6112, 6113, -6111, -5799, -6018]]
                    }, {
                        "type": "Polygon",
                        "id": 5007,
                        "arcs": [[-5843, 6114, 6115, 6116, 6117, -5946, -5936]]
                    }, {
                        "type": "Polygon",
                        "id": 5049,
                        "arcs": [[6118, 6119, 6120, -5930, -5716, -5888]]
                    }, {
                        "type": "Polygon",
                        "id": 5015,
                        "arcs": [[-5816, -5921, 6121, 6122, 6123, -6115, -5842]]
                    }, {
                        "type": "Polygon",
                        "id": 5135,
                        "arcs": [[-5887, 6124, 6125, 6126, 6127, -6119]]
                    }, {
                        "type": "Polygon",
                        "id": 5121,
                        "arcs": [[6128, 6129, -6125, -5886, -5917, 6130]]
                    }, {
                        "type": "Polygon",
                        "id": 5009,
                        "arcs": [[6131, 6132, 6133, -6122, -5920]]
                    }, {
                        "type": "Polygon",
                        "id": 5089,
                        "arcs": [[6134, 6135, -6132, -5919, -5932]]
                    }, {
                        "type": "Polygon",
                        "id": 5005,
                        "arcs": [[-6121, 6136, 6137, 6138, -6135, -5931]]
                    }, {
                        "type": "Polygon",
                        "id": 5021,
                        "arcs": [[-5866, -5973, 6139, -6131, -5916]]
                    }, {
                        "type": "Polygon",
                        "id": 6031,
                        "arcs": [[6140, 6141, -5873, -5382, -5941]]
                    }, {
                        "type": "Polygon",
                        "id": 47169,
                        "arcs": [[-5966, 6142, 6143, -5955]]
                    }, {
                        "type": "Polygon",
                        "id": 47021,
                        "arcs": [[6144, 6145, 6146, 6147, -5960, -5951]]
                    }, {
                        "type": "Polygon",
                        "id": 47179,
                        "arcs": [[-6086, 6148, 6149, -6008, -5981]]
                    }, {
                        "type": "Polygon",
                        "id": 37193,
                        "arcs": [[-6034, 6150, 6151, 6152, 6153, 6154, -6020, -6027]]
                    }, {
                        "type": "Polygon",
                        "id": 47173,
                        "arcs": [[6155, 6156, 6157, -6006, -5995]]
                    }, {
                        "type": "Polygon",
                        "id": 47159,
                        "arcs": [[-6076, 6158, 6159, 6160, -6143, -5965]]
                    }, {
                        "type": "Polygon",
                        "id": 29155,
                        "arcs": [[-6100, 6161, 6162, -5968, -5901]]
                    }, {
                        "type": "Polygon",
                        "id": 40143,
                        "arcs": [[-6005, 6163, 6164, 6165, -6028, -5744, -5758]]
                    }, {
                        "type": "Polygon",
                        "id": 47057,
                        "arcs": [[-6002, -6011, 6166, 6167, 6168, -6156, -5994]]
                    }, {
                        "type": "Polygon",
                        "id": 47037,
                        "arcs": [[-5957, 6169, 6170, 6171, -6145, -5950]]
                    }, {
                        "type": "Polygon",
                        "id": 47059,
                        "arcs": [[6172, 6173, 6174, 6175, 6176, -6009, -6150]]
                    }, {
                        "type": "Polygon",
                        "id": 37189,
                        "arcs": [[-6155, 6177, 6178, -5986, -6021]]
                    }, {
                        "type": "Polygon",
                        "id": 37143,
                        "arcs": [[6179, 6180, -6037, -6088]]
                    }, {
                        "type": "Polygon",
                        "id": 47129,
                        "arcs": [[-5991, 6181, 6182, 6183, -6022]]
                    }, {
                        "type": "Polygon",
                        "id": 47083,
                        "arcs": [[-5962, 6184, 6185, 6186, -5943]]
                    }, {
                        "type": "Polygon",
                        "id": 47005,
                        "arcs": [[-6187, 6187, 6188, 6189, 6190, -6105, -5944]]
                    }, {
                        "type": "Polygon",
                        "id": 47189,
                        "arcs": [[-6144, -6161, 6191, 6192, 6193, -6170, -5956]]
                    }, {
                        "type": "Polygon",
                        "id": 37041,
                        "arcs": [[6194, -6038, -6181]]
                    }, {
                        "type": "Polygon",
                        "id": 47063,
                        "arcs": [[-6177, 6195, 6196, -6167, -6010]]
                    }, {
                        "type": "Polygon",
                        "id": 47043,
                        "arcs": [[-6148, -6147, 6197, 6198, 6199, -6185, -5961]]
                    }, {
                        "type": "Polygon",
                        "id": 5087,
                        "arcs": [[6200, 6201, 6202, 6203, 6204, -6116, -6124]]
                    }, {
                        "type": "Polygon",
                        "id": 47141,
                        "arcs": [[-6024, 6205, 6206, 6207, -6159, -6075, -6073]]
                    }, {
                        "type": "Polygon",
                        "id": 47001,
                        "arcs": [[-6158, 6208, 6209, -6182, -5990, -6007]]
                    }, {
                        "type": "Polygon",
                        "id": 37197,
                        "arcs": [[6210, 6211, 6212, -6151, -6033]]
                    }, {
                        "type": "Polygon",
                        "id": 37011,
                        "arcs": [[6213, 6214, 6215, 6216, 6217, -6083, -5987, -6179]]
                    }, {
                        "type": "Polygon",
                        "id": 37069,
                        "arcs": [[6218, 6219, -6065, -6063, -6052]]
                    }, {
                        "type": "Polygon",
                        "id": 5055,
                        "arcs": [[-5972, -5971, 6220, 6221, -6129, -6140]]
                    }, {
                        "type": "Polygon",
                        "id": 35033,
                        "arcs": [[-5814, 6222, 6223, 6224, -5772, -5812]]
                    }, {
                        "type": "Polygon",
                        "id": 37067,
                        "arcs": [[6225, 6226, 6227, -6211, -6032, -6047]]
                    }, {
                        "type": "Polygon",
                        "id": 5065,
                        "arcs": [[-6128, 6228, 6229, -6137, -6120]]
                    }, {
                        "type": "Polygon",
                        "id": 47171,
                        "arcs": [[6230, 6231, 6232, -6173, -6149, -6085]]
                    }, {
                        "type": "Polygon",
                        "id": 5075,
                        "arcs": [[-6222, 6233, 6234, 6235, -6126, -6130]]
                    }, {
                        "type": "Polygon",
                        "id": 37081,
                        "arcs": [[6236, 6237, 6238, -6226, -6070]]
                    }, {
                        "type": "Polygon",
                        "id": 37001,
                        "arcs": [[6239, 6240, 6241, -6237, -6069, -6072]]
                    }, {
                        "type": "Polygon",
                        "id": 40119,
                        "arcs": [[6242, 6243, 6244, -5998, -6030]]
                    }, {
                        "type": "Polygon",
                        "id": 47085,
                        "arcs": [[-6200, 6245, 6246, -6188, -6186]]
                    }, {
                        "type": "Polygon",
                        "id": 37015,
                        "arcs": [[6247, 6248, 6249, -6250, 6250, -6077, -6054, -6058]]
                    }, {
                        "type": "Polygon",
                        "id": 37135,
                        "arcs": [[-6061, 6251, 6252, -6240, -6071]]
                    }, {
                        "type": "Polygon",
                        "id": 37063,
                        "arcs": [[-6067, 6253, 6254, -6252, -6060]]
                    }, {
                        "type": "Polygon",
                        "id": 5143,
                        "arcs": [[6255, 6256, -6117, -6205]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 37055,
                        "arcs": [[[6257, 6258]], [[-6044, 6259]]]
                    }, {
                        "type": "Polygon",
                        "id": 47053,
                        "arcs": [[6260, 6261, 6262, 6263, -6090, -6098]]
                    }, {
                        "type": "Polygon",
                        "id": 35043,
                        "arcs": [[6264, 6265, 6266, 6267, 6268, -5777, -5775]]
                    }, {
                        "type": "Polygon",
                        "id": 35021,
                        "arcs": [[-5789, 6269, 6270, -6223, -5813]]
                    }, {
                        "type": "Polygon",
                        "id": 47045,
                        "arcs": [[6271, 6272, 6273, -6162, -6099, -6091, -6264]]
                    }, {
                        "type": "Polygon",
                        "id": 37127,
                        "arcs": [[-6080, 6274, 6275, 6276, -6219]]
                    }, {
                        "type": "Polygon",
                        "id": 47089,
                        "arcs": [[-6197, 6277, 6278, 6279, -6168]]
                    }, {
                        "type": "Polygon",
                        "id": 47093,
                        "arcs": [[-6280, 6280, 6281, 6282, 6283, -6209, -6157, -6169]]
                    }, {
                        "type": "Polygon",
                        "id": 47029,
                        "arcs": [[-6175, 6284, 6285, 6286, 6287, -6278, -6196, -6176]]
                    }, {
                        "type": "Polygon",
                        "id": 47035,
                        "arcs": [[-6184, 6288, 6289, 6290, 6291, 6292, 6293, 6294, -6206, -6023]]
                    }, {
                        "type": "Polygon",
                        "id": 40073,
                        "arcs": [[6295, 6296, 6297, -6093, -6013]]
                    }, {
                        "type": "Polygon",
                        "id": 40083,
                        "arcs": [[-5999, -6245, 6298, 6299, -6296, -6012]]
                    }, {
                        "type": "Polygon",
                        "id": 40011,
                        "arcs": [[-6298, 6300, 6301, 6302, 6303, -6094]]
                    }, {
                        "type": "Polygon",
                        "id": 40043,
                        "arcs": [[6304, 6305, -6015, -5923, -6095, -6304]]
                    }, {
                        "type": "Polygon",
                        "id": 40037,
                        "arcs": [[-6166, 6306, 6307, 6308, -6243, -6029]]
                    }, {
                        "type": "Polygon",
                        "id": 40145,
                        "arcs": [[-6082, 6309, 6310, 6311, -6164, -6004]]
                    }, {
                        "type": "Polygon",
                        "id": 40021,
                        "arcs": [[-5948, 6312, 6313, 6314, -6310, -6081]]
                    }, {
                        "type": "Polygon",
                        "id": 40001,
                        "arcs": [[-6118, -6257, 6315, 6316, -6313, -5947]]
                    }, {
                        "type": "Polygon",
                        "id": 37121,
                        "arcs": [[-6218, 6317, 6318, -6231, -6084]]
                    }, {
                        "type": "Polygon",
                        "id": 37065,
                        "arcs": [[6319, 6320, 6321, -6275, -6079]]
                    }, {
                        "type": "Polygon",
                        "id": 47017,
                        "arcs": [[-6191, 6322, 6323, 6324, -6261, -6097, -6106]]
                    }, {
                        "type": "Polygon",
                        "id": 47041,
                        "arcs": [[6325, 6326, 6327, -6192, -6160, -6208]]
                    }, {
                        "type": "Polygon",
                        "id": 5137,
                        "arcs": [[6328, 6329, 6330, 6331, -6138, -6230]]
                    }, {
                        "type": "Polygon",
                        "id": 5101,
                        "arcs": [[-6134, 6332, 6333, 6334, -6201, -6123]]
                    }, {
                        "type": "Polygon",
                        "id": 37027,
                        "arcs": [[-6154, 6335, 6336, 6337, -6214, -6178]]
                    }, {
                        "type": "Polygon",
                        "id": 5129,
                        "arcs": [[-6139, -6332, 6338, 6339, -6333, -6133, -6136]]
                    }, {
                        "type": "Polygon",
                        "id": 47149,
                        "arcs": [[6340, 6341, 6342, 6343, 6344, -6171, -6194]]
                    }, {
                        "type": "Polygon",
                        "id": 37199,
                        "arcs": [[6345, 6346, 6347, -6232, -6319]]
                    }, {
                        "type": "Polygon",
                        "id": 47185,
                        "arcs": [[-6295, 6348, 6349, -6326, -6207]]
                    }, {
                        "type": "Polygon",
                        "id": 37183,
                        "arcs": [[-6220, 6350, 6351, 6352, -6254, -6066]]
                    }, {
                        "type": "Polygon",
                        "id": 37117,
                        "arcs": [[6249, 6353, 6354, 6355, -6320, -6078, -6251]]
                    }, {
                        "type": "Polygon",
                        "id": 37115,
                        "arcs": [[-6233, -6348, 6356, 6357, -6285, 6174, -6175, -6174]]
                    }, {
                        "type": "Polygon",
                        "id": 37059,
                        "arcs": [[6358, 6359, 6360, -6212, -6228]]
                    }, {
                        "type": "Polygon",
                        "id": 48393,
                        "arcs": [[-6114, 6361, 6362, 6363, 6364, -6107, -6112]]
                    }, {
                        "type": "Polygon",
                        "id": 48211,
                        "arcs": [[-6113, -6017, 6365, 6366, -6362]]
                    }, {
                        "type": "Polygon",
                        "id": 48233,
                        "arcs": [[-6108, -6365, 6367, 6368]]
                    }, {
                        "type": "Polygon",
                        "id": 48205,
                        "arcs": [[6369, 6370, 6371, -5787, -6110]]
                    }, {
                        "type": "Polygon",
                        "id": 37097,
                        "arcs": [[-6213, -6361, 6372, 6373, 6374, 6375, 6376, 6377, -6152]]
                    }, {
                        "type": "Polygon",
                        "id": 48341,
                        "arcs": [[-6369, 6378, 6379, 6380, -6370, -6102]]
                    }, {
                        "type": "Polygon",
                        "id": 47187,
                        "arcs": [[-6345, 6381, 6382, 6383, -6198, -6146, -6172]]
                    }, {
                        "type": "Polygon",
                        "id": 37003,
                        "arcs": [[6384, -6336, -6153, -6378]]
                    }, {
                        "type": "Polygon",
                        "id": 47145,
                        "arcs": [[6385, 6386, 6387, 6388, -6289, -6183, -6210, -6284, 6389]]
                    }, {
                        "type": "Polygon",
                        "id": 47155,
                        "arcs": [[-6288, -6287, 6286, 6390, 6391, 6392, -6281, -6279]]
                    }, {
                        "type": "Polygon",
                        "id": 37057,
                        "arcs": [[-6239, 6393, 6394, 6395, -6359, -6227]]
                    }, {
                        "type": "Polygon",
                        "id": 40129,
                        "arcs": [[-6306, 6396, 6397, 6398, -6366, -6016]]
                    }, {
                        "type": "Polygon",
                        "id": 35031,
                        "arcs": [[-6269, 6399, -5780, -5778]]
                    }, {
                        "type": "Polygon",
                        "id": 35049,
                        "arcs": [[-6225, 6400, 6401, 6402, -6266, 6403, 6404, 6405, -5773]]
                    }, {
                        "type": "Polygon",
                        "id": 5093,
                        "arcs": [[6406, 6407, 6408, 6409, 6410, 6411, 6412, -5969, -6163, -6274]]
                    }, {
                        "type": "Polygon",
                        "id": 37023,
                        "arcs": [[-6338, 6413, 6414, 6415, 6416, 6417, -6216, -6215]]
                    }, {
                        "type": "Polygon",
                        "id": 47033,
                        "arcs": [[6418, 6419, 6420, -6272, -6263]]
                    }, {
                        "type": "Polygon",
                        "id": 5031,
                        "arcs": [[-6413, 6421, 6422, -6234, -6221, -5970]]
                    }, {
                        "type": "Polygon",
                        "id": 37177,
                        "arcs": [[6423, 6424, 6425]]
                    }, {
                        "type": "Polygon",
                        "id": 47081,
                        "arcs": [[-6384, 6426, 6427, 6428, -6246, -6199]]
                    }, {
                        "type": "Polygon",
                        "id": 37187,
                        "arcs": [[-6425, 6429, 6430, -6354, -6250, -6249, 6431]]
                    }, {
                        "type": "Polygon",
                        "id": 35028,
                        "arcs": [[-5774, -6406, 6432, -6404, -6265]]
                    }, {
                        "type": "Polygon",
                        "id": 47015,
                        "arcs": [[6433, 6434, -6341, -6193, -6328]]
                    }, {
                        "type": "Polygon",
                        "id": 37111,
                        "arcs": [[6435, 6436, -6346, -6318, -6217, -6418]]
                    }, {
                        "type": "Polygon",
                        "id": 47097,
                        "arcs": [[-6421, 6437, 6438, -6407, -6273]]
                    }, {
                        "type": "Polygon",
                        "id": 40081,
                        "arcs": [[-6309, 6439, 6440, 6441, -6299, -6244]]
                    }, {
                        "type": "Polygon",
                        "id": 5063,
                        "arcs": [[-6236, 6442, 6443, 6444, -6329, -6229, -6127]]
                    }, {
                        "type": "Polygon",
                        "id": 37151,
                        "arcs": [[-6242, 6445, 6446, 6447, -6394, -6238]]
                    }, {
                        "type": "Polygon",
                        "id": 47105,
                        "arcs": [[-6390, -6283, 6448, 6449, 6450, -6386]]
                    }, {
                        "type": "Polygon",
                        "id": 5067,
                        "arcs": [[-6235, -6423, 6451, 6452, 6453, 6454, -6443]]
                    }, {
                        "type": "Polygon",
                        "id": 47009,
                        "arcs": [[6455, 6456, 6457, -6449, -6282, -6393]]
                    }, {
                        "type": "Polygon",
                        "id": 37037,
                        "arcs": [[-6255, -6353, 6458, 6459, 6460, 6461, -6446, -6241, -6253]]
                    }, {
                        "type": "Polygon",
                        "id": 35047,
                        "arcs": [[-6271, 6462, 6463, 6464, -6401, -6224]]
                    }, {
                        "type": "Polygon",
                        "id": 37195,
                        "arcs": [[6465, 6466, 6467, 6468, -6276, -6322]]
                    }, {
                        "type": "Polygon",
                        "id": 37159,
                        "arcs": [[-6396, 6469, 6470, -6373, -6360]]
                    }, {
                        "type": "Polygon",
                        "id": 40111,
                        "arcs": [[-6165, -6312, 6471, 6472, 6473, -6307]]
                    }, {
                        "type": "Polygon",
                        "id": 40101,
                        "arcs": [[-6315, 6474, 6475, 6476, -6472, -6311]]
                    }, {
                        "type": "Polygon",
                        "id": 47177,
                        "arcs": [[-6350, 6477, 6478, 6479, 6480, -6434, -6327]]
                    }, {
                        "type": "Polygon",
                        "id": 47119,
                        "arcs": [[6481, 6482, 6483, 6484, -6427, -6383]]
                    }, {
                        "type": "Polygon",
                        "id": 47039,
                        "arcs": [[6485, 6486, 6487, 6488, -6323, -6190]]
                    }, {
                        "type": "Polygon",
                        "id": 47135,
                        "arcs": [[-6429, 6489, 6490, -6486, -6189, -6247]]
                    }, {
                        "type": "Polygon",
                        "id": 37147,
                        "arcs": [[-6356, 6491, 6492, 6493, 6494, 6495, 6496, -6466, -6321]]
                    }, {
                        "type": "Polygon",
                        "id": 37035,
                        "arcs": [[-6377, 6497, -6414, -6337, -6385]]
                    }, {
                        "type": "Polygon",
                        "id": 37021,
                        "arcs": [[-6437, 6498, 6499, 6500, -6357, -6347]]
                    }, {
                        "type": "Polygon",
                        "id": 47143,
                        "arcs": [[6501, 6502, 6503, -6290, -6389]]
                    }, {
                        "type": "Polygon",
                        "id": 47175,
                        "arcs": [[-6294, 6504, -6292, 6505, 6506, -6478, -6349]]
                    }, {
                        "type": "Polygon",
                        "id": 47077,
                        "arcs": [[-6489, 6507, 6508, 6509, -6324]]
                    }, {
                        "type": "Polygon",
                        "id": 47075,
                        "arcs": [[6510, 6511, 6512, 6513, -6438, -6420]]
                    }, {
                        "type": "Polygon",
                        "id": 37101,
                        "arcs": [[-6469, 6514, 6515, 6516, -6351, -6277]]
                    }, {
                        "type": "Polygon",
                        "id": 40039,
                        "arcs": [[-6303, 6517, 6518, 6519, -6397, -6305]]
                    }, {
                        "type": "Polygon",
                        "id": 6071,
                        "arcs": [[6520, 6521, 6522, 6523, 6524, 6525, -5468, -5913]]
                    }, {
                        "type": "Polygon",
                        "id": 6079,
                        "arcs": [[-6142, 6526, 6527, 6528, -5874]]
                    }, {
                        "type": "Polygon",
                        "id": 6029,
                        "arcs": [[-6526, 6529, 6530, 6531, -6527, -6141, -5940, -5469]]
                    }, {
                        "type": "Polygon",
                        "id": 47113,
                        "arcs": [[-6325, -6510, 6532, 6533, -6511, -6419, -6262]]
                    }, {
                        "type": "Polygon",
                        "id": 5141,
                        "arcs": [[-6331, 6534, 6535, 6536, 6537, -6339]]
                    }, {
                        "type": "Polygon",
                        "id": 37087,
                        "arcs": [[-6501, 6538, 6539, 6540, -6391, -6287, -6286, -6358]]
                    }, {
                        "type": "Polygon",
                        "id": 5047,
                        "arcs": [[6541, 6542, 6543, -6203, 6544]]
                    }, {
                        "type": "Polygon",
                        "id": 47007,
                        "arcs": [[-6504, 6545, 6546, -6506, -6291]]
                    }, {
                        "type": "Polygon",
                        "id": 5071,
                        "arcs": [[-6202, -6335, 6547, 6548, -6545]]
                    }, {
                        "type": "Polygon",
                        "id": 5033,
                        "arcs": [[6549, 6550, -6316, -6256, -6204, -6544]]
                    }, {
                        "type": "Polygon",
                        "id": 47121,
                        "arcs": [[6551, 6552, 6553, -6502, -6388]]
                    }, {
                        "type": "Polygon",
                        "id": 35037,
                        "arcs": [[-6372, 6554, 6555, 6556, 6557, 6558, 6559, -6463, -6270, -5788]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 37013,
                        "arcs": [[[6560, 6561, 6562, -6494]], [[-6431, 6563, 6564, -6492, -6355]]]
                    }, {
                        "type": "Polygon",
                        "id": 5115,
                        "arcs": [[-6340, -6538, 6565, 6566, 6567, -6548, -6334]]
                    }, {
                        "type": "Polygon",
                        "id": 40017,
                        "arcs": [[6568, 6569, 6570, 6571, 6572, -6301, -6297]]
                    }, {
                        "type": "Polygon",
                        "id": 40109,
                        "arcs": [[-6442, 6573, 6574, -6569, -6300]]
                    }, {
                        "type": "Polygon",
                        "id": 5023,
                        "arcs": [[-6445, 6575, 6576, -6535, -6330]]
                    }, {
                        "type": "Polygon",
                        "id": 47117,
                        "arcs": [[6577, 6578, 6579, -6482, -6382, -6344]]
                    }, {
                        "type": "Polygon",
                        "id": 5111,
                        "arcs": [[-6412, 6580, 6581, -6452, -6422]]
                    }, {
                        "type": "Polygon",
                        "id": 37095,
                        "arcs": [[-6424, 6582, -6258, 6583, -6564, -6430]]
                    }, {
                        "type": "Polygon",
                        "id": 47031,
                        "arcs": [[-6435, -6481, 6584, 6585, 6586, 6587, -6342]]
                    }, {
                        "type": "Polygon",
                        "id": 47003,
                        "arcs": [[-6588, 6588, 6589, -6578, -6343]]
                    }, {
                        "type": "Polygon",
                        "id": 37173,
                        "arcs": [[6590, 6591, 6592, -6456, -6392, -6541]]
                    }, {
                        "type": "Polygon",
                        "id": 47123,
                        "arcs": [[-6458, 6593, 6594, 6595, 6596, 6597, 6598, -6450]]
                    }, {
                        "type": "Polygon",
                        "id": 47101,
                        "arcs": [[-6485, 6599, 6600, -6490, -6428]]
                    }, {
                        "type": "Polygon",
                        "id": 37079,
                        "arcs": [[6601, 6602, -6467, -6497]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 47167,
                        "arcs": [[[6603, 6604, -6410]], [[-6514, 6605, 6606, -6408, -6439]]]
                    }, {
                        "type": "Polygon",
                        "id": 47107,
                        "arcs": [[-6451, -6599, 6607, -6597, 6608, 6609, -6552, -6387]]
                    }, {
                        "type": "Polygon",
                        "id": 40135,
                        "arcs": [[-6317, -6551, 6610, 6611, 6612, -6475, -6314]]
                    }, {
                        "type": "Polygon",
                        "id": 40107,
                        "arcs": [[-6474, 6613, 6614, 6615, 6616, -6440, -6308]]
                    }, {
                        "type": "Polygon",
                        "id": 37105,
                        "arcs": [[6617, 6618, -6461, -6460]]
                    }, {
                        "type": "Polygon",
                        "id": 48359,
                        "arcs": [[-6381, 6619, 6620, -6555, -6371]]
                    }, {
                        "type": "Polygon",
                        "id": 48065,
                        "arcs": [[-6364, 6621, 6622, 6623, -6379, -6368]]
                    }, {
                        "type": "Polygon",
                        "id": 48179,
                        "arcs": [[6624, 6625, -6622, -6363]]
                    }, {
                        "type": "Polygon",
                        "id": 48483,
                        "arcs": [[-6399, 6626, 6627, -6625, -6367]]
                    }, {
                        "type": "Polygon",
                        "id": 48375,
                        "arcs": [[-6624, 6628, -6620, -6380]]
                    }, {
                        "type": "Polygon",
                        "id": 37161,
                        "arcs": [[6629, 6630, 6631, 6632, 6633, -6499, -6436, -6417]]
                    }, {
                        "type": "Polygon",
                        "id": 37191,
                        "arcs": [[-6603, 6634, 6635, 6636, -6515, -6468]]
                    }, {
                        "type": "Polygon",
                        "id": 47023,
                        "arcs": [[6637, 6638, 6639, -6533, -6509]]
                    }, {
                        "type": "Polygon",
                        "id": 37085,
                        "arcs": [[-6517, 6640, 6641, 6642, -6618, -6459, -6352]]
                    }, {
                        "type": "Polygon",
                        "id": 37045,
                        "arcs": [[6643, 6644, 6645, 6646, -6630, -6416]]
                    }, {
                        "type": "Polygon",
                        "id": 37109,
                        "arcs": [[-6376, 6647, 6648, -6644, -6415, -6498]]
                    }, {
                        "type": "Polygon",
                        "id": 47153,
                        "arcs": [[6649, 6650, 6651, -6479, -6507, -6547]]
                    }, {
                        "type": "Polygon",
                        "id": 40091,
                        "arcs": [[6652, 6653, 6654, -6614, -6473, -6477]]
                    }, {
                        "type": "Polygon",
                        "id": 40015,
                        "arcs": [[-6573, 6655, 6656, 6657, 6658, -6518, -6302]]
                    }, {
                        "type": "Polygon",
                        "id": 5145,
                        "arcs": [[-6455, 6659, 6660, 6661, 6662, -6576, -6444]]
                    }, {
                        "type": "Polygon",
                        "id": 47061,
                        "arcs": [[6663, 6664, -6585, -6480, -6652]]
                    }, {
                        "type": "Polygon",
                        "id": 4025,
                        "arcs": [[6665, 6666, 6667, 6668, 6669, -5736]]
                    }, {
                        "type": "Polygon",
                        "id": 37099,
                        "arcs": [[-6540, 6670, 6671, 6672, 6673, -6591]]
                    }, {
                        "type": "Polygon",
                        "id": 37119,
                        "arcs": [[6674, 6675, 6676, 6677, 6678, -6648, -6375]]
                    }, {
                        "type": "Polygon",
                        "id": 37125,
                        "arcs": [[-6619, -6643, 6679, 6680, 6681, 6682, -6447, -6462]]
                    }, {
                        "type": "Polygon",
                        "id": 37123,
                        "arcs": [[-6683, 6683, 6684, -6395, -6448]]
                    }, {
                        "type": "Polygon",
                        "id": 37025,
                        "arcs": [[6685, 6686, -6675, -6374, -6471]]
                    }, {
                        "type": "Polygon",
                        "id": 40009,
                        "arcs": [[-6520, 6687, 6688, 6689, 6690, 6691, -6627, -6398]]
                    }, {
                        "type": "Polygon",
                        "id": 37167,
                        "arcs": [[-6685, 6692, 6693, -6686, -6470]]
                    }, {
                        "type": "Polygon",
                        "id": 37089,
                        "arcs": [[-6634, 6694, 6695, 6696, -6500]]
                    }, {
                        "type": "Polygon",
                        "id": 47181,
                        "arcs": [[6697, 6698, 6699, -6487, -6491, -6601]]
                    }, {
                        "type": "Polygon",
                        "id": 40133,
                        "arcs": [[6700, 6701, 6702, -6616]]
                    }, {
                        "type": "Polygon",
                        "id": 37075,
                        "arcs": [[6703, 6704, -6594, -6457, -6593]]
                    }, {
                        "type": "Polygon",
                        "id": 40149,
                        "arcs": [[-6659, 6705, -6688, -6519]]
                    }, {
                        "type": "Polygon",
                        "id": 40125,
                        "arcs": [[-6617, -6703, 6706, 6707, 6708, -6574, -6441]]
                    }, {
                        "type": "Polygon",
                        "id": 5029,
                        "arcs": [[6709, 6710, 6711, -6566, -6537]]
                    }, {
                        "type": "Polygon",
                        "id": 47099,
                        "arcs": [[-6484, 6712, 6713, -6698, -6600]]
                    }, {
                        "type": "Polygon",
                        "id": 40061,
                        "arcs": [[6714, 6715, 6716, -6653, -6476, -6613]]
                    }, {
                        "type": "Polygon",
                        "id": 47065,
                        "arcs": [[-6554, 6717, 6718, 6719, 6720, 6721, -6650, -6546, -6503]]
                    }, {
                        "type": "Polygon",
                        "id": 47055,
                        "arcs": [[-6580, 6722, 6723, 6724, -6713, -6483]]
                    }, {
                        "type": "Polygon",
                        "id": 5131,
                        "arcs": [[-6543, 6725, 6726, 6727, -6611, -6550]]
                    }, {
                        "type": "Polygon",
                        "id": 5037,
                        "arcs": [[6728, 6729, 6730, -6453, -6582]]
                    }, {
                        "type": "Polygon",
                        "id": 5147,
                        "arcs": [[-6731, 6731, 6732, 6733, -6660, -6454]]
                    }, {
                        "type": "Polygon",
                        "id": 5035,
                        "arcs": [[-6411, -6605, 6734, 6735, 6736, 6737, 6738, -6729, -6581]]
                    }, {
                        "type": "Polygon",
                        "id": 47069,
                        "arcs": [[-6534, -6640, 6739, 6740, 6741, 6742, 6743, -6512]]
                    }, {
                        "type": "Polygon",
                        "id": 37107,
                        "arcs": [[6744, 6745, 6746, -6635, -6602, -6496]]
                    }, {
                        "type": "Polygon",
                        "id": 5083,
                        "arcs": [[-6549, -6568, 6747, 6748, -6726, -6542]]
                    }, {
                        "type": "Polygon",
                        "id": 37175,
                        "arcs": [[6749, 6750, 6751, -6671, -6539, -6697]]
                    }, {
                        "type": "Polygon",
                        "id": 47071,
                        "arcs": [[-6700, 6752, 6753, 6754, 6755, -6638, -6508, -6488]]
                    }, {
                        "type": "Polygon",
                        "id": 37071,
                        "arcs": [[-6679, 6756, -6645, -6649]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 37049,
                        "arcs": [[[6757, 6758, 6759]], [[-6563, 6760, 6761, 6762, -6745, -6495]]]
                    }, {
                        "type": "Polygon",
                        "id": 47127,
                        "arcs": [[6763, 6764, -6589, -6587]]
                    }, {
                        "type": "Polygon",
                        "id": 47157,
                        "arcs": [[6765, 6766, 6767, -6735, -6604, -6409, -6607]]
                    }, {
                        "type": "Polygon",
                        "id": 37149,
                        "arcs": [[6768, 6769, -6695, -6633]]
                    }, {
                        "type": "Polygon",
                        "id": 47047,
                        "arcs": [[-6744, 6770, 6771, -6766, -6606, -6513]]
                    }, {
                        "type": "Polygon",
                        "id": 47109,
                        "arcs": [[-6756, 6772, -6740, -6639]]
                    }, {
                        "type": "Polygon",
                        "id": 40079,
                        "arcs": [[6773, 6774, 6775, 6776, 6777, -6715, -6612, -6728]]
                    }, {
                        "type": "Polygon",
                        "id": 40051,
                        "arcs": [[6778, 6779, 6780, 6781, -6656, -6572]]
                    }, {
                        "type": "Polygon",
                        "id": 40027,
                        "arcs": [[-6709, 6782, -6570, -6575]]
                    }, {
                        "type": "Polygon",
                        "id": 47103,
                        "arcs": [[-6765, 6783, 6784, 6785, -6723, -6579, -6590]]
                    }, {
                        "type": "Polygon",
                        "id": 5045,
                        "arcs": [[-6577, -6663, 6786, 6787, 6788, -6710, -6536]]
                    }, {
                        "type": "Polygon",
                        "id": 47051,
                        "arcs": [[-6665, 6789, 6790, 6791, -6784, -6764, -6586]]
                    }, {
                        "type": "Polygon",
                        "id": 47011,
                        "arcs": [[6792, 6793, 6794, -6718, -6553, -6610]]
                    }, {
                        "type": "Polygon",
                        "id": 35006,
                        "arcs": [[-6268, 6795, 6796, 6797, 6798, -5781, -6400]]
                    }, {
                        "type": "Polygon",
                        "id": 40087,
                        "arcs": [[-6708, 6799, 6800, -6779, -6571, -6783]]
                    }, {
                        "type": "Polygon",
                        "id": 37113,
                        "arcs": [[6801, 6802, 6803, -6704, -6592, -6674]]
                    }, {
                        "type": "Polygon",
                        "id": 37137,
                        "arcs": [[-6761, -6562, 6804]]
                    }, {
                        "type": "Polygon",
                        "id": 47115,
                        "arcs": [[-6722, 6805, 6806, -6790, -6664, -6651]]
                    }, {
                        "type": "Polygon",
                        "id": 37163,
                        "arcs": [[-6637, 6807, 6808, 6809, 6810, -6641, -6516]]
                    }, {
                        "type": "Polygon",
                        "id": 5149,
                        "arcs": [[-6712, 6811, 6812, 6813, 6814, -6748, -6567]]
                    }, {
                        "type": "Polygon",
                        "id": 40121,
                        "arcs": [[-6717, 6815, 6816, 6817, 6818, 6819, -6654]]
                    }, {
                        "type": "Polygon",
                        "id": 37039,
                        "arcs": [[-6804, 6820, 6821, 6822, 6823, -6595, -6705]]
                    }, {
                        "type": "Polygon",
                        "id": 40063,
                        "arcs": [[-6655, -6820, 6824, 6825, -6701, -6615]]
                    }, {
                        "type": "Polygon",
                        "id": 47139,
                        "arcs": [[-6824, 6826, 6827, -6793, -6609, -6596]]
                    }, {
                        "type": "Polygon",
                        "id": 37051,
                        "arcs": [[-6811, 6828, 6829, 6830, -6680, -6642]]
                    }, {
                        "type": "Polygon",
                        "id": 37103,
                        "arcs": [[6831, -6759, 6832, 6833, 6834, -6746, -6763]]
                    }, {
                        "type": "Polygon",
                        "id": 35001,
                        "arcs": [[-6403, 6835, 6836, -6796, -6267]]
                    }, {
                        "type": "Polygon",
                        "id": 35019,
                        "arcs": [[-6560, 6837, 6838, 6839, -6464]]
                    }, {
                        "type": "Polygon",
                        "id": 45045,
                        "arcs": [[-6770, 6840, 6841, 6842, 6843, 6844, -6750, -6696]]
                    }, {
                        "type": "Polygon",
                        "id": 37007,
                        "arcs": [[6845, 6846, 6847, 6848, -6693]]
                    }, {
                        "type": "Polygon",
                        "id": 37093,
                        "arcs": [[-6831, 6849, 6850, 6851, -6681]]
                    }, {
                        "type": "Polygon",
                        "id": 37179,
                        "arcs": [[-6849, 6852, 6853, -6676, -6687, -6694]]
                    }, {
                        "type": "Polygon",
                        "id": 45083,
                        "arcs": [[6854, 6855, -6841, -6769, -6632, 6856]]
                    }, {
                        "type": "Polygon",
                        "id": 37061,
                        "arcs": [[-6747, -6835, 6857, 6858, -6808, -6636]]
                    }, {
                        "type": "Polygon",
                        "id": 48117,
                        "arcs": [[6859, 6860, 6861, 6862, -6556, -6621]]
                    }, {
                        "type": "Polygon",
                        "id": 45021,
                        "arcs": [[6863, 6864, -6857, -6631, -6647, 6865]]
                    }, {
                        "type": "Polygon",
                        "id": 48129,
                        "arcs": [[6866, 6867, 6868, 6869, -6626]]
                    }, {
                        "type": "Polygon",
                        "id": 48087,
                        "arcs": [[-6692, 6870, 6871, 6872, -6867, -6628]]
                    }, {
                        "type": "Polygon",
                        "id": 48381,
                        "arcs": [[6873, 6874, 6875, -6860, -6629]]
                    }, {
                        "type": "Polygon",
                        "id": 37153,
                        "arcs": [[-6682, 6876, 6877, -6846, -6684]]
                    }, {
                        "type": "Polygon",
                        "id": 48011,
                        "arcs": [[-6870, 6878, 6879, -6874, -6623]]
                    }, {
                        "type": "Polygon",
                        "id": 45091,
                        "arcs": [[6880, 6881, 6882, -6866, -6646, -6757, -6678]]
                    }, {
                        "type": "Polygon",
                        "id": 37043,
                        "arcs": [[-6803, 6883, 6884, 6885, -6821]]
                    }, {
                        "type": "Polygon",
                        "id": 5123,
                        "arcs": [[-6739, 6886, 6887, -6732, -6730]]
                    }, {
                        "type": "Polygon",
                        "id": 40075,
                        "arcs": [[-6658, 6888, 6889, 6890, 6891, -6689, -6706]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 37031,
                        "arcs": [[[6892, -6833, -6758, 6893]]]
                    }, {
                        "type": "Polygon",
                        "id": 40055,
                        "arcs": [[-6892, 6894, 6895, -6690]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 6083,
                        "arcs": [[[6896]], [[6897]], [[-6532, 6898, 6899, -6528]]]
                    }, {
                        "type": "Polygon",
                        "id": 5105,
                        "arcs": [[6900, 6901, 6902, -6812, -6711, -6789]]
                    }, {
                        "type": "Polygon",
                        "id": 5127,
                        "arcs": [[-6815, 6903, 6904, -6774, -6727, -6749]]
                    }, {
                        "type": "Polygon",
                        "id": 5117,
                        "arcs": [[-6734, 6905, 6906, 6907, -6661]]
                    }, {
                        "type": "Polygon",
                        "id": 45077,
                        "arcs": [[-6845, 6908, 6909, -6751]]
                    }, {
                        "type": "Polygon",
                        "id": 5085,
                        "arcs": [[-6908, 6910, 6911, 6912, -6787, -6662]]
                    }, {
                        "type": "Polygon",
                        "id": 45057,
                        "arcs": [[-6854, 6913, 6914, 6915, 6916, -6881, -6677]]
                    }, {
                        "type": "Polygon",
                        "id": 40077,
                        "arcs": [[-6778, 6917, -6816, -6716]]
                    }, {
                        "type": "Polygon",
                        "id": 45073,
                        "arcs": [[6918, 6919, 6920, 6921, 6922, 6923, -6672, -6752, -6910]]
                    }, {
                        "type": "Polygon",
                        "id": 35057,
                        "arcs": [[-6840, 6924, 6925, 6926, -6836, -6402, -6465]]
                    }, {
                        "type": "Polygon",
                        "id": 37165,
                        "arcs": [[-6851, 6927, 6928, -6877, -6852]]
                    }, {
                        "type": "Polygon",
                        "id": 40057,
                        "arcs": [[-6896, 6929, 6930, 6931, -6871, -6691]]
                    }, {
                        "type": "Polygon",
                        "id": 5119,
                        "arcs": [[-6913, 6932, 6933, 6934, -6901, -6788]]
                    }, {
                        "type": "Polygon",
                        "id": 1077,
                        "arcs": [[6935, 6936, 6937, -6753, -6699, -6714, -6725, 6938]]
                    }, {
                        "type": "Polygon",
                        "id": 5095,
                        "arcs": [[-6888, 6939, 6940, 6941, -6906, -6733]]
                    }, {
                        "type": "Polygon",
                        "id": 13241,
                        "arcs": [[6942, 6943, -6884, -6802, -6673, -6924]]
                    }, {
                        "type": "Polygon",
                        "id": 1083,
                        "arcs": [[-6786, 6944, 6945, 6946, -6939, -6724]]
                    }, {
                        "type": "Polygon",
                        "id": 28003,
                        "arcs": [[6947, 6948, -6741, -6773, -6755, 6949]]
                    }, {
                        "type": "Polygon",
                        "id": 28141,
                        "arcs": [[6950, 6951, 6952, -6950, -6754, -6938, 6953]]
                    }, {
                        "type": "Polygon",
                        "id": 28139,
                        "arcs": [[6954, 6955, 6956, -6742, -6949]]
                    }, {
                        "type": "Polygon",
                        "id": 28033,
                        "arcs": [[6957, 6958, 6959, -6736, -6768, 6960]]
                    }, {
                        "type": "Polygon",
                        "id": 28009,
                        "arcs": [[6961, 6962, -6771, -6743, -6957]]
                    }, {
                        "type": "Polygon",
                        "id": 28093,
                        "arcs": [[6963, 6964, 6965, -6961, -6767, -6772, -6963]]
                    }, {
                        "type": "Polygon",
                        "id": 13281,
                        "arcs": [[-6944, 6966, 6967, 6968, -6885]]
                    }, {
                        "type": "Polygon",
                        "id": 1089,
                        "arcs": [[-6792, 6969, 6970, 6971, -6945, -6785]]
                    }, {
                        "type": "Polygon",
                        "id": 1071,
                        "arcs": [[6972, 6973, -6970, -6791, -6807, 6974]]
                    }, {
                        "type": "Polygon",
                        "id": 13213,
                        "arcs": [[6975, 6976, 6977, 6978, -6794, -6828, 6979]]
                    }, {
                        "type": "Polygon",
                        "id": 13111,
                        "arcs": [[-6823, 6980, 6981, 6982, 6983, -6980, -6827]]
                    }, {
                        "type": "Polygon",
                        "id": 13313,
                        "arcs": [[-6978, 6984, 6985, 6986, -6795, -6979]]
                    }, {
                        "type": "Polygon",
                        "id": 13047,
                        "arcs": [[6987, -6719, -6987]]
                    }, {
                        "type": "Polygon",
                        "id": 13291,
                        "arcs": [[-6886, -6969, 6988, 6989, -6981, -6822]]
                    }, {
                        "type": "Polygon",
                        "id": 37133,
                        "arcs": [[-6893, 6990, 6991, -6858, -6834]]
                    }, {
                        "type": "Polygon",
                        "id": 13083,
                        "arcs": [[-6806, -6721, 6992, 6993, -6975]]
                    }, {
                        "type": "Polygon",
                        "id": 13295,
                        "arcs": [[-6986, 6994, 6995, 6996, 6997, -6993, -6720, -6988]]
                    }, {
                        "type": "Polygon",
                        "id": 40123,
                        "arcs": [[-6702, -6826, 6998, 6999, 7000, 7001, -6800, -6707]]
                    }, {
                        "type": "Polygon",
                        "id": 35061,
                        "arcs": [[-6837, -6927, 7002, -6797]]
                    }, {
                        "type": "Polygon",
                        "id": 37155,
                        "arcs": [[7003, 7004, 7005, 7006, 7007, -6928, -6850, -6830]]
                    }, {
                        "type": "Polygon",
                        "id": 35009,
                        "arcs": [[-6863, 7008, 7009, 7010, -6557]]
                    }, {
                        "type": "Polygon",
                        "id": 45087,
                        "arcs": [[-6864, -6883, 7011, 7012, 7013, 7014, -6855, -6865]]
                    }, {
                        "type": "Polygon",
                        "id": 5077,
                        "arcs": [[-6738, 7015, 7016, -6940, -6887]]
                    }, {
                        "type": "Polygon",
                        "id": 1033,
                        "arcs": [[7017, 7018, -6954, -6937]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 6111,
                        "arcs": [[[7019]], [[7020, -6899, -6531, 7021]]]
                    }, {
                        "type": "Polygon",
                        "id": 28143,
                        "arcs": [[-6737, -6960, 7022, 7023, 7024, 7025, 7026, -7016]]
                    }, {
                        "type": "Polygon",
                        "id": 1049,
                        "arcs": [[-6998, 7027, 7028, 7029, 7030, -6973, -6994]]
                    }, {
                        "type": "Polygon",
                        "id": 37017,
                        "arcs": [[7031, 7032, -7004, -6829, -6810]]
                    }, {
                        "type": "Polygon",
                        "id": 40065,
                        "arcs": [[7033, 7034, 7035, 7036, -6930, -6895, -6891]]
                    }, {
                        "type": "Polygon",
                        "id": 5125,
                        "arcs": [[-6935, 7037, 7038, 7039, -6902]]
                    }, {
                        "type": "Polygon",
                        "id": 40031,
                        "arcs": [[-6657, -6782, 7040, 7041, 7042, -6889]]
                    }, {
                        "type": "Polygon",
                        "id": 40049,
                        "arcs": [[-7002, 7043, 7044, 7045, -6780, -6801]]
                    }, {
                        "type": "Polygon",
                        "id": 13123,
                        "arcs": [[7046, 7047, 7048, -6976, -6984]]
                    }, {
                        "type": "Polygon",
                        "id": 13137,
                        "arcs": [[-6923, 7049, 7050, 7051, 7052, -6967, -6943]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 6037,
                        "arcs": [[[7053]], [[7054]], [[-6525, 7055, 7056, -7022, -6530]]]
                    }, {
                        "type": "Polygon",
                        "id": 45023,
                        "arcs": [[-6917, 7057, -7012, -6882]]
                    }, {
                        "type": "Polygon",
                        "id": 45007,
                        "arcs": [[-6843, 7058, 7059, 7060, -6919, -6909, -6844]]
                    }, {
                        "type": "Polygon",
                        "id": 45025,
                        "arcs": [[7061, 7062, 7063, -6914, -6853, -6848, 7064]]
                    }, {
                        "type": "Polygon",
                        "id": 45069,
                        "arcs": [[-7008, 7065, 7066, 7067, -7065, -6847, -6878, -6929]]
                    }, {
                        "type": "Polygon",
                        "id": 1079,
                        "arcs": [[-6947, 7068, 7069, 7070, 7071, -7018, -6936]]
                    }, {
                        "type": "Polygon",
                        "id": 13311,
                        "arcs": [[7072, 7073, -6989, -6968, -7053]]
                    }, {
                        "type": "Polygon",
                        "id": 45059,
                        "arcs": [[-7015, 7074, 7075, 7076, -6842, -6856]]
                    }, {
                        "type": "Polygon",
                        "id": 35011,
                        "arcs": [[7077, 7078, 7079, -6838, -6559]]
                    }, {
                        "type": "Polygon",
                        "id": 28137,
                        "arcs": [[-6966, 7080, 7081, -7023, -6959, -6958]]
                    }, {
                        "type": "Polygon",
                        "id": 5051,
                        "arcs": [[-7040, 7082, 7083, -6813, -6903]]
                    }, {
                        "type": "Polygon",
                        "id": 40029,
                        "arcs": [[-6819, 7084, 7085, -6999, -6825]]
                    }, {
                        "type": "Polygon",
                        "id": 28117,
                        "arcs": [[-6953, 7086, 7087, 7088, -6955, -6948]]
                    }, {
                        "type": "Polygon",
                        "id": 48437,
                        "arcs": [[-6880, 7089, 7090, 7091, 7092, -6875]]
                    }, {
                        "type": "Polygon",
                        "id": 48045,
                        "arcs": [[-6869, 7093, 7094, 7095, -7090, -6879]]
                    }, {
                        "type": "Polygon",
                        "id": 48069,
                        "arcs": [[-7093, 7096, 7097, 7098, -6861, -6876]]
                    }, {
                        "type": "Polygon",
                        "id": 48191,
                        "arcs": [[-6873, 7099, 7100, 7101, -7094, -6868]]
                    }, {
                        "type": "Polygon",
                        "id": 48075,
                        "arcs": [[-6932, 7102, 7103, -7100, -6872]]
                    }, {
                        "type": "Polygon",
                        "id": 5097,
                        "arcs": [[-7084, 7104, 7105, 7106, 7107, -6904, -6814]]
                    }, {
                        "type": "Polygon",
                        "id": 48369,
                        "arcs": [[-7099, 7108, 7109, -7009, -6862]]
                    }, {
                        "type": "Polygon",
                        "id": 13187,
                        "arcs": [[-7074, 7110, 7111, -6982, -6990]]
                    }, {
                        "type": "Polygon",
                        "id": 37141,
                        "arcs": [[-6992, 7112, 7113, 7114, 7115, -7032, -6809, -6859]]
                    }, {
                        "type": "Polygon",
                        "id": 5113,
                        "arcs": [[7116, 7117, 7118, -6775, -6905, -7108]]
                    }, {
                        "type": "Polygon",
                        "id": 1103,
                        "arcs": [[-6972, 7119, 7120, -7069, -6946]]
                    }, {
                        "type": "Polygon",
                        "id": 13257,
                        "arcs": [[7121, 7122, -7050, -6922]]
                    }, {
                        "type": "Polygon",
                        "id": 40137,
                        "arcs": [[-7046, 7123, 7124, 7125, -7041, -6781]]
                    }, {
                        "type": "Polygon",
                        "id": 40005,
                        "arcs": [[7126, 7127, 7128, 7129, -7085, -6818]]
                    }, {
                        "type": "Polygon",
                        "id": 40127,
                        "arcs": [[-6777, 7130, 7131, -7127, -6817, -6918]]
                    }, {
                        "type": "Polygon",
                        "id": 5107,
                        "arcs": [[-7027, 7132, 7133, 7134, 7135, -6941, -7017]]
                    }, {
                        "type": "Polygon",
                        "id": 40099,
                        "arcs": [[-7001, 7136, 7137, -7044]]
                    }, {
                        "type": "Polygon",
                        "id": 40141,
                        "arcs": [[-7043, 7138, 7139, 7140, -7035, -7034, -6890]]
                    }, {
                        "type": "Polygon",
                        "id": 13129,
                        "arcs": [[-7049, 7141, 7142, 7143, -6995, -6985, -6977]]
                    }, {
                        "type": "Polygon",
                        "id": 45033,
                        "arcs": [[7144, 7145, 7146, -7066, -7007]]
                    }, {
                        "type": "Polygon",
                        "id": 13085,
                        "arcs": [[-7112, 7147, 7148, 7149, 7150, -7047, -6983]]
                    }, {
                        "type": "Polygon",
                        "id": 45055,
                        "arcs": [[-7063, 7151, 7152, 7153, 7154, 7155, -6915, -7064]]
                    }, {
                        "type": "Polygon",
                        "id": 35041,
                        "arcs": [[-7011, 7156, 7157, 7158, 7159, -7078, -6558]]
                    }, {
                        "type": "Polygon",
                        "id": 28145,
                        "arcs": [[-7089, 7160, 7161, 7162, -6964, -6962, -6956]]
                    }, {
                        "type": "Polygon",
                        "id": 1095,
                        "arcs": [[-7031, 7163, 7164, 7165, -7120, -6971, -6974]]
                    }, {
                        "type": "Polygon",
                        "id": 13055,
                        "arcs": [[7166, 7167, -7028, -6997]]
                    }, {
                        "type": "Polygon",
                        "id": 13115,
                        "arcs": [[-7144, 7168, 7169, 7170, -7167, -6996]]
                    }, {
                        "type": "Polygon",
                        "id": 35053,
                        "arcs": [[-6926, 7171, 7172, 7173, -6798, -7003]]
                    }, {
                        "type": "Polygon",
                        "id": 35003,
                        "arcs": [[-7174, 7174, 7175, 7176, -5782, -6799]]
                    }, {
                        "type": "Polygon",
                        "id": 1059,
                        "arcs": [[-7072, 7177, 7178, 7179, -6951, -7019]]
                    }, {
                        "type": "Polygon",
                        "id": 48197,
                        "arcs": [[-7037, 7180, 7181, 7182, -7103, -6931]]
                    }, {
                        "type": "Polygon",
                        "id": 45039,
                        "arcs": [[-6916, -7156, 7183, 7184, -7013, -7058]]
                    }, {
                        "type": "Polygon",
                        "id": 5001,
                        "arcs": [[-6942, -7136, 7185, 7186, 7187, -6911, -6907]]
                    }, {
                        "type": "Polygon",
                        "id": 13227,
                        "arcs": [[-7151, 7188, -7142, -7048]]
                    }, {
                        "type": "Polygon",
                        "id": 28071,
                        "arcs": [[-7163, 7189, 7190, 7191, 7192, -7081, -6965]]
                    }, {
                        "type": "Polygon",
                        "id": 28107,
                        "arcs": [[-7193, 7193, 7194, 7195, -7024, -7082]]
                    }, {
                        "type": "Polygon",
                        "id": 13119,
                        "arcs": [[7196, 7197, 7198, -7122, -6921]]
                    }, {
                        "type": "Polygon",
                        "id": 45031,
                        "arcs": [[-7068, 7199, 7200, -7152, -7062]]
                    }, {
                        "type": "Polygon",
                        "id": 45071,
                        "arcs": [[-7185, 7201, 7202, 7203, 7204, -7075, -7014]]
                    }, {
                        "type": "Polygon",
                        "id": 1019,
                        "arcs": [[-7171, 7205, 7206, 7207, 7208, -7029, -7168]]
                    }, {
                        "type": "Polygon",
                        "id": 28027,
                        "arcs": [[7209, 7210, 7211, -7133, -7026, 7212]]
                    }, {
                        "type": "Polygon",
                        "id": 28119,
                        "arcs": [[-7196, 7213, -7213, -7025]]
                    }, {
                        "type": "Polygon",
                        "id": 13139,
                        "arcs": [[-7052, 7214, 7215, 7216, 7217, -7148, -7111, -7073]]
                    }, {
                        "type": "Polygon",
                        "id": 28081,
                        "arcs": [[7218, 7219, 7220, 7221, -7161, -7088]]
                    }, {
                        "type": "Polygon",
                        "id": 40019,
                        "arcs": [[-7138, 7222, 7223, 7224, 7225, -7124, -7045]]
                    }, {
                        "type": "Polygon",
                        "id": 40069,
                        "arcs": [[-7000, -7086, -7130, 7226, 7227, -7223, -7137]]
                    }, {
                        "type": "Polygon",
                        "id": 40033,
                        "arcs": [[-7126, 7228, 7229, 7230, -7139, -7042]]
                    }, {
                        "type": "Polygon",
                        "id": 40089,
                        "arcs": [[-7119, 7231, 7232, 7233, 7234, 7235, -7131, -6776]]
                    }, {
                        "type": "Polygon",
                        "id": 5059,
                        "arcs": [[-7039, 7236, 7237, 7238, -7105, -7083]]
                    }, {
                        "type": "Polygon",
                        "id": 4007,
                        "arcs": [[-5733, 7239, 7240, 7241, -6667, -6666, -5735]]
                    }, {
                        "type": "Polygon",
                        "id": 13147,
                        "arcs": [[-7061, 7242, 7243, -7197, -6920]]
                    }, {
                        "type": "Polygon",
                        "id": 5053,
                        "arcs": [[-6934, 7244, 7245, 7246, -7237, -7038]]
                    }, {
                        "type": "Polygon",
                        "id": 5069,
                        "arcs": [[-6912, -7188, 7247, 7248, -7245, -6933]]
                    }, {
                        "type": "Polygon",
                        "id": 13011,
                        "arcs": [[7249, 7250, -7215, -7051, -7123, -7199]]
                    }, {
                        "type": "Polygon",
                        "id": 37047,
                        "arcs": [[-7116, 7251, 7252, -7005, -7033]]
                    }, {
                        "type": "Polygon",
                        "id": 45001,
                        "arcs": [[7253, 7254, 7255, -7059, -7077]]
                    }, {
                        "type": "Polygon",
                        "id": 28057,
                        "arcs": [[-6952, -7180, 7256, 7257, -7219, -7087]]
                    }, {
                        "type": "Polygon",
                        "id": 48487,
                        "arcs": [[-7141, 7258, 7259, 7260, -7181, -7036]]
                    }, {
                        "type": "Polygon",
                        "id": 13015,
                        "arcs": [[7261, 7262, 7263, -7169, -7143, 7264]]
                    }, {
                        "type": "Polygon",
                        "id": 13057,
                        "arcs": [[-7150, 7265, 7266, 7267, -7265, -7189]]
                    }, {
                        "type": "Polygon",
                        "id": 45047,
                        "arcs": [[-7205, 7268, 7269, 7270, -7254, -7076]]
                    }, {
                        "type": "Polygon",
                        "id": 37129,
                        "arcs": [[7271, 7272, 7273, 7274, -7114]]
                    }, {
                        "type": "Polygon",
                        "id": 28115,
                        "arcs": [[-7222, 7275, 7276, -7190, -7162]]
                    }, {
                        "type": "Polygon",
                        "id": 45061,
                        "arcs": [[7277, 7278, -7153, -7201]]
                    }, {
                        "type": "Polygon",
                        "id": 37019,
                        "arcs": [[-7275, 7279, 7280, 7281, 7282, -7252, -7115]]
                    }, {
                        "type": "Polygon",
                        "id": 5061,
                        "arcs": [[7283, 7284, 7285, 7286, -7117]]
                    }, {
                        "type": "Polygon",
                        "id": 5109,
                        "arcs": [[7287, 7288, 7289, -7284, -7107]]
                    }, {
                        "type": "Polygon",
                        "id": 35027,
                        "arcs": [[-7080, 7290, 7291, 7292, -7172, -6925, -6839]]
                    }, {
                        "type": "Polygon",
                        "id": 5019,
                        "arcs": [[-7239, 7293, 7294, 7295, -7288, -7106]]
                    }, {
                        "type": "Polygon",
                        "id": 13117,
                        "arcs": [[-7218, 7296, 7297, -7266, -7149]]
                    }, {
                        "type": "Polygon",
                        "id": 1093,
                        "arcs": [[7298, 7299, 7300, 7301, 7302, -7257, -7179]]
                    }, {
                        "type": "Polygon",
                        "id": 4012,
                        "arcs": [[-6669, 7303, 7304, 7305, 7306, -6522, 7307]]
                    }, {
                        "type": "Polygon",
                        "id": 48345,
                        "arcs": [[7308, 7309, 7310, -7095, -7102]]
                    }, {
                        "type": "Polygon",
                        "id": 48101,
                        "arcs": [[-7104, -7183, 7311, 7312, -7309, -7101]]
                    }, {
                        "type": "Polygon",
                        "id": 1043,
                        "arcs": [[-7166, 7313, 7314, 7315, -7070, -7121]]
                    }, {
                        "type": "Polygon",
                        "id": 48153,
                        "arcs": [[-7311, 7316, 7317, -7091, -7096]]
                    }, {
                        "type": "Polygon",
                        "id": 48189,
                        "arcs": [[-7097, -7092, -7318, 7318, 7319]]
                    }, {
                        "type": "Polygon",
                        "id": 48279,
                        "arcs": [[-7320, 7320, 7321, -7109, -7098]]
                    }, {
                        "type": "Polygon",
                        "id": 45041,
                        "arcs": [[7322, 7323, 7324, 7325, -7278, -7200, -7067, -7147]]
                    }, {
                        "type": "Polygon",
                        "id": 48017,
                        "arcs": [[-7322, 7326, -7157, -7010, -7110]]
                    }, {
                        "type": "Polygon",
                        "id": 1133,
                        "arcs": [[-7071, -7316, 7327, -7299, -7178]]
                    }, {
                        "type": "Polygon",
                        "id": 45051,
                        "arcs": [[-7253, -7283, 7328, 7329, 7330, -7145, -7006]]
                    }, {
                        "type": "Polygon",
                        "id": 45067,
                        "arcs": [[-7331, 7331, 7332, -7323, -7146]]
                    }, {
                        "type": "Polygon",
                        "id": 13157,
                        "arcs": [[7333, 7334, 7335, -7216, -7251]]
                    }, {
                        "type": "Polygon",
                        "id": 40067,
                        "arcs": [[-7226, 7336, 7337, 7338, -7229, -7125]]
                    }, {
                        "type": "Polygon",
                        "id": 13105,
                        "arcs": [[-7256, 7339, 7340, 7341, 7342, 7343, -7243, -7060]]
                    }, {
                        "type": "Polygon",
                        "id": 13195,
                        "arcs": [[-7344, 7344, 7345, 7346, -7334, -7250, -7198, -7244]]
                    }, {
                        "type": "Polygon",
                        "id": 45079,
                        "arcs": [[7347, 7348, 7349, -7202, -7184, -7155]]
                    }, {
                        "type": "Polygon",
                        "id": 1009,
                        "arcs": [[-7165, 7350, 7351, 7352, 7353, -7314]]
                    }, {
                        "type": "Polygon",
                        "id": 48155,
                        "arcs": [[-7182, -7261, 7354, 7355, 7356, -7312]]
                    }, {
                        "type": "Polygon",
                        "id": 48485,
                        "arcs": [[-7231, 7357, 7358, -7259, -7140]]
                    }, {
                        "type": "Polygon",
                        "id": 1055,
                        "arcs": [[-7209, 7359, 7360, -7351, -7164, -7030]]
                    }, {
                        "type": "Polygon",
                        "id": 45063,
                        "arcs": [[7361, 7362, 7363, 7364, -7203, -7350]]
                    }, {
                        "type": "Polygon",
                        "id": 28161,
                        "arcs": [[7365, 7366, 7367, -7194, -7192]]
                    }, {
                        "type": "Polygon",
                        "id": 5133,
                        "arcs": [[7368, -7232, -7118, -7287]]
                    }, {
                        "type": "Polygon",
                        "id": 45081,
                        "arcs": [[-7365, 7369, 7370, -7269, -7204]]
                    }, {
                        "type": "Polygon",
                        "id": 13121,
                        "arcs": [[-7298, 7371, 7372, 7373, 7374, 7375, 7376, 7377, 7378, -7267]]
                    }, {
                        "type": "Polygon",
                        "id": 40095,
                        "arcs": [[7379, 7380, 7381, -7224, -7228]]
                    }, {
                        "type": "Polygon",
                        "id": 5079,
                        "arcs": [[-7187, 7382, 7383, 7384, -7248]]
                    }, {
                        "type": "Polygon",
                        "id": 45085,
                        "arcs": [[-7326, 7385, 7386, -7348, -7154, -7279]]
                    }, {
                        "type": "Polygon",
                        "id": 13135,
                        "arcs": [[7387, 7388, 7389, 7390, -7372, -7297, -7217]]
                    }, {
                        "type": "Polygon",
                        "id": 28135,
                        "arcs": [[-7368, 7391, 7392, 7393, -7210, -7214, -7195]]
                    }, {
                        "type": "Polygon",
                        "id": 28013,
                        "arcs": [[-7277, 7394, 7395, 7396, -7366, -7191]]
                    }, {
                        "type": "Polygon",
                        "id": 40013,
                        "arcs": [[7397, 7398, 7399, 7400, -7380, -7227, -7129]]
                    }, {
                        "type": "Polygon",
                        "id": 40023,
                        "arcs": [[-7236, 7401, 7402, -7398, -7128, -7132]]
                    }, {
                        "type": "Polygon",
                        "id": 5039,
                        "arcs": [[-7247, 7403, 7404, 7405, -7294, -7238]]
                    }, {
                        "type": "Polygon",
                        "id": 48077,
                        "arcs": [[-7339, 7406, 7407, 7408, -7358, -7230]]
                    }, {
                        "type": "Polygon",
                        "id": 13013,
                        "arcs": [[7409, 7410, -7388, -7336]]
                    }, {
                        "type": "Polygon",
                        "id": 28011,
                        "arcs": [[7411, 7412, 7413, 7414, -7134, -7212]]
                    }, {
                        "type": "Polygon",
                        "id": 5041,
                        "arcs": [[-7415, 7415, 7416, -7383, -7186, -7135]]
                    }, {
                        "type": "Polygon",
                        "id": 13233,
                        "arcs": [[-7264, 7417, 7418, 7419, -7206, -7170]]
                    }, {
                        "type": "Polygon",
                        "id": 28095,
                        "arcs": [[-7258, -7303, 7420, 7421, 7422, 7423, -7220]]
                    }, {
                        "type": "Polygon",
                        "id": 35005,
                        "arcs": [[-7160, 7424, 7425, 7426, -7291, -7079]]
                    }, {
                        "type": "Polygon",
                        "id": 13067,
                        "arcs": [[-7379, 7427, 7428, -7262, -7268]]
                    }, {
                        "type": "Polygon",
                        "id": 6065,
                        "arcs": [[7429, 7430, 7431, -6523, -7307]]
                    }, {
                        "type": "Polygon",
                        "id": 13223,
                        "arcs": [[-7429, 7432, 7433, 7434, -7418, -7263]]
                    }, {
                        "type": "Polygon",
                        "id": 45065,
                        "arcs": [[-7271, 7435, 7436, 7437, -7340, -7255]]
                    }, {
                        "type": "Polygon",
                        "id": 28017,
                        "arcs": [[-7221, -7424, 7438, 7439, -7395, -7276]]
                    }, {
                        "type": "Polygon",
                        "id": 40085,
                        "arcs": [[-7382, 7440, 7441, 7442, -7337, -7225]]
                    }, {
                        "type": "Polygon",
                        "id": 5025,
                        "arcs": [[-7385, 7443, 7444, 7445, -7404, -7246, -7249]]
                    }, {
                        "type": "Polygon",
                        "id": 1075,
                        "arcs": [[7446, 7447, 7448, -7421, -7302]]
                    }, {
                        "type": "Polygon",
                        "id": 13221,
                        "arcs": [[-7343, 7449, 7450, 7451, 7452, 7453, -7346, -7345]]
                    }, {
                        "type": "Polygon",
                        "id": 4013,
                        "arcs": [[-7242, 7454, 7455, 7456, -7304, -6668]]
                    }, {
                        "type": "Polygon",
                        "id": 13059,
                        "arcs": [[-7454, 7457, -7335, -7347]]
                    }, {
                        "type": "Polygon",
                        "id": 5057,
                        "arcs": [[7458, 7459, 7460, 7461, -7285, -7290]]
                    }, {
                        "type": "Polygon",
                        "id": 1127,
                        "arcs": [[-7315, -7354, 7462, 7463, 7464, -7300, -7328]]
                    }, {
                        "type": "Polygon",
                        "id": 13317,
                        "arcs": [[7465, 7466, 7467, 7468, -7450, -7342]]
                    }, {
                        "type": "Polygon",
                        "id": 48337,
                        "arcs": [[-7443, 7469, 7470, 7471, -7407, -7338]]
                    }, {
                        "type": "Polygon",
                        "id": 1115,
                        "arcs": [[7472, 7473, 7474, 7475, -7352, -7361]]
                    }, {
                        "type": "Polygon",
                        "id": 28133,
                        "arcs": [[-7394, 7476, 7477, 7478, -7412, -7211]]
                    }, {
                        "type": "Polygon",
                        "id": 13181,
                        "arcs": [[-7438, 7479, 7480, -7466, -7341]]
                    }, {
                        "type": "Polygon",
                        "id": 45037,
                        "arcs": [[7481, 7482, 7483, -7436, -7270, -7371]]
                    }, {
                        "type": "Polygon",
                        "id": 13089,
                        "arcs": [[-7391, 7484, 7485, 7486, -7373]]
                    }, {
                        "type": "Polygon",
                        "id": 1015,
                        "arcs": [[7487, -7473, -7360, -7208, 7488]]
                    }, {
                        "type": "Polygon",
                        "id": 13219,
                        "arcs": [[-7453, 7489, 7490, 7491, -7410, -7458]]
                    }, {
                        "type": "Polygon",
                        "id": 1029,
                        "arcs": [[-7420, 7492, 7493, 7494, 7495, 7496, -7489, -7207]]
                    }, {
                        "type": "Polygon",
                        "id": 48387,
                        "arcs": [[-7235, 7497, 7498, 7499, 7500, 7501, 7502, -7402]]
                    }, {
                        "type": "Polygon",
                        "id": 5099,
                        "arcs": [[-7296, 7503, 7504, 7505, -7459, -7289]]
                    }, {
                        "type": "Polygon",
                        "id": 48181,
                        "arcs": [[-7401, 7506, 7507, 7508, 7509, -7441, -7381]]
                    }, {
                        "type": "Polygon",
                        "id": 48097,
                        "arcs": [[-7510, 7510, 7511, -7470, -7442]]
                    }, {
                        "type": "Polygon",
                        "id": 5081,
                        "arcs": [[-7286, -7462, 7512, 7513, -7233, -7369]]
                    }, {
                        "type": "Polygon",
                        "id": 45027,
                        "arcs": [[7514, 7515, 7516, 7517, -7386, -7325]]
                    }, {
                        "type": "Polygon",
                        "id": 6059,
                        "arcs": [[-6524, -7432, 7518, 7519, -7056]]
                    }, {
                        "type": "Polygon",
                        "id": 48277,
                        "arcs": [[-7503, 7520, 7521, -7399, -7403]]
                    }, {
                        "type": "Polygon",
                        "id": 13297,
                        "arcs": [[-7492, 7522, 7523, 7524, -7389, -7411]]
                    }, {
                        "type": "Polygon",
                        "id": 1057,
                        "arcs": [[-7465, 7525, 7526, -7447, -7301]]
                    }, {
                        "type": "Polygon",
                        "id": 13143,
                        "arcs": [[7527, -7493, -7419, -7435]]
                    }, {
                        "type": "Polygon",
                        "id": 28043,
                        "arcs": [[-7397, 7528, 7529, 7530, 7531, -7392, -7367]]
                    }, {
                        "type": "Polygon",
                        "id": 45089,
                        "arcs": [[-7333, 7532, 7533, -7515, -7324]]
                    }, {
                        "type": "Polygon",
                        "id": 48147,
                        "arcs": [[-7522, 7534, 7535, 7536, -7507, -7400]]
                    }, {
                        "type": "Polygon",
                        "id": 45017,
                        "arcs": [[-7387, -7518, 7537, -7362, -7349]]
                    }, {
                        "type": "Polygon",
                        "id": 45003,
                        "arcs": [[7538, 7539, 7540, 7541, -7482, -7370, -7364]]
                    }, {
                        "type": "Polygon",
                        "id": 1073,
                        "arcs": [[-7476, 7542, 7543, 7544, -7463, -7353]]
                    }, {
                        "type": "Polygon",
                        "id": 48269,
                        "arcs": [[-7357, 7545, 7546, 7547, -7313]]
                    }, {
                        "type": "Polygon",
                        "id": 48275,
                        "arcs": [[7548, 7549, -7546, -7356]]
                    }, {
                        "type": "Polygon",
                        "id": 48009,
                        "arcs": [[-7409, 7550, 7551, 7552, -7359]]
                    }, {
                        "type": "Polygon",
                        "id": 48125,
                        "arcs": [[-7548, 7553, 7554, -7310]]
                    }, {
                        "type": "Polygon",
                        "id": 48107,
                        "arcs": [[-7555, 7555, 7556, -7317]]
                    }, {
                        "type": "Polygon",
                        "id": 48023,
                        "arcs": [[-7553, 7557, -7549, -7355, -7260]]
                    }, {
                        "type": "Polygon",
                        "id": 48303,
                        "arcs": [[-7557, 7558, 7559, -7319]]
                    }, {
                        "type": "Polygon",
                        "id": 48079,
                        "arcs": [[7560, 7561, 7562, -7158, -7327]]
                    }, {
                        "type": "Polygon",
                        "id": 48219,
                        "arcs": [[-7560, 7563, -7561, -7321]]
                    }, {
                        "type": "Polygon",
                        "id": 5103,
                        "arcs": [[-7406, 7564, 7565, 7566, -7504, -7295]]
                    }, {
                        "type": "Polygon",
                        "id": 13211,
                        "arcs": [[7567, 7568, 7569, 7570, -7523, -7491]]
                    }, {
                        "type": "Polygon",
                        "id": 13045,
                        "arcs": [[-7377, 7571, 7572, 7573, -7494, -7528, -7434, 7574]]
                    }, {
                        "type": "Polygon",
                        "id": 28083,
                        "arcs": [[-7532, 7575, 7576, 7577, -7477, -7393]]
                    }, {
                        "type": "Polygon",
                        "id": 28025,
                        "arcs": [[-7423, 7578, 7579, 7580, -7439]]
                    }, {
                        "type": "Polygon",
                        "id": 13097,
                        "arcs": [[-7378, -7575, -7433, -7428]]
                    }, {
                        "type": "Polygon",
                        "id": 5013,
                        "arcs": [[7581, 7582, -7565, -7405, -7446]]
                    }, {
                        "type": "Polygon",
                        "id": 5043,
                        "arcs": [[-7417, 7583, 7584, 7585, -7444, -7384]]
                    }, {
                        "type": "Polygon",
                        "id": 13247,
                        "arcs": [[7586, -7485, -7390, -7525, 7587]]
                    }, {
                        "type": "Polygon",
                        "id": 45043,
                        "arcs": [[-7330, 7588, 7589, 7590, -7533, -7332]]
                    }, {
                        "type": "Polygon",
                        "id": 4011,
                        "arcs": [[-7177, 7591, 7592, 7593, 7594, -5783]]
                    }, {
                        "type": "Polygon",
                        "id": 13133,
                        "arcs": [[7595, 7596, 7597, -7568, -7490, -7452]]
                    }, {
                        "type": "Polygon",
                        "id": 28087,
                        "arcs": [[-7449, 7598, 7599, 7600, -7579, -7422]]
                    }, {
                        "type": "Polygon",
                        "id": 13217,
                        "arcs": [[-7571, 7601, 7602, 7603, -7588, -7524]]
                    }, {
                        "type": "Polygon",
                        "id": 28155,
                        "arcs": [[-7581, 7604, 7605, 7606, -7529, -7396, -7440]]
                    }, {
                        "type": "Polygon",
                        "id": 13265,
                        "arcs": [[7607, 7608, 7609, -7596, -7451, -7469]]
                    }, {
                        "type": "Polygon",
                        "id": 48037,
                        "arcs": [[-7514, 7610, 7611, 7612, -7498, -7234]]
                    }, {
                        "type": "Polygon",
                        "id": 45075,
                        "arcs": [[-7517, 7613, 7614, 7615, 7616, 7617, -7539, -7363, -7538]]
                    }, {
                        "type": "Polygon",
                        "id": 5011,
                        "arcs": [[-7586, 7618, 7619, -7582, -7445]]
                    }, {
                        "type": "Polygon",
                        "id": 13073,
                        "arcs": [[-7437, -7484, 7620, 7621, -7480]]
                    }, {
                        "type": "Polygon",
                        "id": 1121,
                        "arcs": [[-7488, -7497, 7622, 7623, 7624, -7474]]
                    }, {
                        "type": "Polygon",
                        "id": 28097,
                        "arcs": [[-7607, 7625, 7626, 7627, -7530]]
                    }, {
                        "type": "Polygon",
                        "id": 28015,
                        "arcs": [[-7628, 7628, 7629, -7576, -7531]]
                    }, {
                        "type": "Polygon",
                        "id": 13189,
                        "arcs": [[-7481, -7622, 7630, 7631, 7632, 7633, -7467]]
                    }, {
                        "type": "Polygon",
                        "id": 4009,
                        "arcs": [[-7595, 7634, 7635, 7636, -7240, -5732, -5784]]
                    }, {
                        "type": "Polygon",
                        "id": 13063,
                        "arcs": [[-7487, 7637, 7638, 7639, -7374]]
                    }, {
                        "type": "Polygon",
                        "id": 13151,
                        "arcs": [[-7587, -7604, 7640, 7641, -7638, -7486]]
                    }, {
                        "type": "Polygon",
                        "id": 5091,
                        "arcs": [[7642, 7643, 7644, 7645, -7611, -7513, -7461]]
                    }, {
                        "type": "Polygon",
                        "id": 13301,
                        "arcs": [[7646, 7647, 7648, -7609, -7608, -7468, -7634]]
                    }, {
                        "type": "Polygon",
                        "id": 1125,
                        "arcs": [[-7464, -7545, 7649, 7650, 7651, 7652, -7526]]
                    }, {
                        "type": "Polygon",
                        "id": 35025,
                        "arcs": [[-7563, 7653, 7654, 7655, 7656, 7657, 7658, -7425, -7159]]
                    }, {
                        "type": "Polygon",
                        "id": 28105,
                        "arcs": [[-7601, 7659, 7660, 7661, -7605, -7580]]
                    }, {
                        "type": "Polygon",
                        "id": 5017,
                        "arcs": [[-7414, 7662, 7663, 7664, 7665, 7666, 7667, -7584, -7416]]
                    }, {
                        "type": "Polygon",
                        "id": 13113,
                        "arcs": [[7668, 7669, -7375, -7640]]
                    }, {
                        "type": "Polygon",
                        "id": 1117,
                        "arcs": [[-7625, 7670, 7671, 7672, -7543, -7475]]
                    }, {
                        "type": "Polygon",
                        "id": 13245,
                        "arcs": [[7673, 7674, 7675, -7631, -7621, -7483, -7542]]
                    }, {
                        "type": "Polygon",
                        "id": 1107,
                        "arcs": [[-7527, -7653, 7676, 7677, 7678, -7599, -7448]]
                    }, {
                        "type": "Polygon",
                        "id": 28019,
                        "arcs": [[-7662, 7679, 7680, -7626, -7606]]
                    }, {
                        "type": "Polygon",
                        "id": 28151,
                        "arcs": [[-7479, 7681, 7682, 7683, -7663, -7413]]
                    }, {
                        "type": "Polygon",
                        "id": 13159,
                        "arcs": [[7684, 7685, 7686, 7687, -7602, -7570]]
                    }, {
                        "type": "Polygon",
                        "id": 13077,
                        "arcs": [[-7670, 7688, 7689, 7690, 7691, -7572, -7376]]
                    }, {
                        "type": "Polygon",
                        "id": 45015,
                        "arcs": [[-7591, 7692, 7693, 7694, 7695, -7614, -7516, -7534]]
                    }, {
                        "type": "Polygon",
                        "id": 6073,
                        "arcs": [[7696, 7697, -7519, -7431]]
                    }, {
                        "type": "Polygon",
                        "id": 1111,
                        "arcs": [[-7574, 7698, 7699, 7700, 7701, 7702, -7495]]
                    }, {
                        "type": "Polygon",
                        "id": 1027,
                        "arcs": [[-7703, 7703, 7704, -7623, -7496]]
                    }, {
                        "type": "Polygon",
                        "id": 48119,
                        "arcs": [[-7502, 7705, 7706, 7707, -7535, -7521]]
                    }, {
                        "type": "Polygon",
                        "id": 45011,
                        "arcs": [[7708, 7709, 7710, -7540, -7618]]
                    }, {
                        "type": "Polygon",
                        "id": 13237,
                        "arcs": [[7711, 7712, 7713, -7685, -7569, -7598]]
                    }, {
                        "type": "Polygon",
                        "id": 35051,
                        "arcs": [[-7293, 7714, 7715, 7716, 7717, -7175, -7173]]
                    }, {
                        "type": "Polygon",
                        "id": 5073,
                        "arcs": [[-7506, 7718, 7719, 7720, -7643, -7460]]
                    }, {
                        "type": "Polygon",
                        "id": 13141,
                        "arcs": [[-7649, 7721, 7722, 7723, -7712, -7597, -7610]]
                    }, {
                        "type": "Polygon",
                        "id": 4027,
                        "arcs": [[-7457, 7724, 7725, 7726, -7305]]
                    }, {
                        "type": "Polygon",
                        "id": 4021,
                        "arcs": [[-7241, -7637, 7727, -7455]]
                    }, {
                        "type": "Polygon",
                        "id": 48237,
                        "arcs": [[-7472, 7728, 7729, 7730, 7731, -7551, -7408]]
                    }, {
                        "type": "Polygon",
                        "id": 5027,
                        "arcs": [[-7567, 7732, 7733, 7734, -7719, -7505]]
                    }, {
                        "type": "Polygon",
                        "id": 13035,
                        "arcs": [[-7688, 7735, 7736, 7737, -7641, -7603]]
                    }, {
                        "type": "Polygon",
                        "id": 45009,
                        "arcs": [[7738, 7739, -7709, -7617]]
                    }, {
                        "type": "Polygon",
                        "id": 6025,
                        "arcs": [[-7727, 7740, -7697, -7430, -7306]]
                    }, {
                        "type": "Polygon",
                        "id": 48497,
                        "arcs": [[-7512, 7741, 7742, 7743, -7729, -7471]]
                    }, {
                        "type": "Polygon",
                        "id": 48121,
                        "arcs": [[7744, 7745, 7746, -7742, -7511, -7509]]
                    }, {
                        "type": "Polygon",
                        "id": 13149,
                        "arcs": [[-7692, 7747, -7699, -7573]]
                    }, {
                        "type": "Polygon",
                        "id": 48231,
                        "arcs": [[7748, 7749, 7750, 7751, 7752, -7536, -7708, 7753]]
                    }, {
                        "type": "Polygon",
                        "id": 48085,
                        "arcs": [[-7537, -7753, 7754, 7755, -7745, -7508]]
                    }, {
                        "type": "Polygon",
                        "id": 48263,
                        "arcs": [[7756, 7757, 7758, 7759, -7554]]
                    }, {
                        "type": "Polygon",
                        "id": 48433,
                        "arcs": [[7760, 7761, 7762, -7757, -7547]]
                    }, {
                        "type": "Polygon",
                        "id": 48449,
                        "arcs": [[7763, 7764, 7765, -7500]]
                    }, {
                        "type": "Polygon",
                        "id": 48169,
                        "arcs": [[-7760, 7766, 7767, 7768, -7556]]
                    }, {
                        "type": "Polygon",
                        "id": 48447,
                        "arcs": [[7769, 7770, 7771, 7772, -7558]]
                    }, {
                        "type": "Polygon",
                        "id": 48503,
                        "arcs": [[-7732, 7773, 7774, -7770, -7552]]
                    }, {
                        "type": "Polygon",
                        "id": 48207,
                        "arcs": [[-7773, 7775, 7776, -7761, -7550]]
                    }, {
                        "type": "Polygon",
                        "id": 5003,
                        "arcs": [[-7668, 7777, 7778, -7619, -7585]]
                    }, {
                        "type": "Polygon",
                        "id": 48305,
                        "arcs": [[-7769, 7779, 7780, 7781, -7559]]
                    }, {
                        "type": "Polygon",
                        "id": 35035,
                        "arcs": [[-7427, 7782, 7783, 7784, 7785, 7786, -7715, -7292]]
                    }, {
                        "type": "Polygon",
                        "id": 48501,
                        "arcs": [[7787, 7788, -7654, -7562]]
                    }, {
                        "type": "Polygon",
                        "id": 48445,
                        "arcs": [[-7782, 7789, 7790, -7788, -7564]]
                    }, {
                        "type": "Polygon",
                        "id": 48159,
                        "arcs": [[-7766, 7791, 7792, 7793, -7706, -7501]]
                    }, {
                        "type": "Polygon",
                        "id": 5139,
                        "arcs": [[-7583, -7620, -7779, 7794, 7795, -7733, -7566]]
                    }, {
                        "type": "Polygon",
                        "id": 48223,
                        "arcs": [[-7794, 7796, 7797, -7754, -7707]]
                    }, {
                        "type": "Polygon",
                        "id": 48343,
                        "arcs": [[-7613, 7798, 7799, 7800, 7801, -7764, -7499]]
                    }, {
                        "type": "Polygon",
                        "id": 28051,
                        "arcs": [[-7630, 7802, 7803, 7804, -7577]]
                    }, {
                        "type": "Polygon",
                        "id": 13255,
                        "arcs": [[-7738, 7805, 7806, 7807, -7689, -7669, -7639, -7642]]
                    }, {
                        "type": "Polygon",
                        "id": 45035,
                        "arcs": [[-7696, 7808, 7809, -7615]]
                    }, {
                        "type": "Polygon",
                        "id": 28053,
                        "arcs": [[-7578, -7805, 7810, 7811, -7682, -7478]]
                    }, {
                        "type": "Polygon",
                        "id": 13125,
                        "arcs": [[7812, 7813, 7814, -7722, -7648]]
                    }, {
                        "type": "Polygon",
                        "id": 13163,
                        "arcs": [[-7675, 7815, 7816, 7817, 7818, -7813, -7647, -7633, -7632, -7676]]
                    }, {
                        "type": "Polygon",
                        "id": 48067,
                        "arcs": [[-7646, 7819, 7820, -7799, -7612]]
                    }, {
                        "type": "Polygon",
                        "id": 13033,
                        "arcs": [[-7541, -7711, 7821, 7822, 7823, 7824, -7816, -7674]]
                    }, {
                        "type": "Polygon",
                        "id": 28103,
                        "arcs": [[-7679, 7825, 7826, 7827, -7660, -7600]]
                    }, {
                        "type": "Polygon",
                        "id": 28159,
                        "arcs": [[-7828, 7828, 7829, 7830, -7680, -7661]]
                    }, {
                        "type": "Polygon",
                        "id": 28007,
                        "arcs": [[-7831, 7831, 7832, -7803, -7629, -7627, -7681]]
                    }, {
                        "type": "Polygon",
                        "id": 1007,
                        "arcs": [[7833, 7834, 7835, -7650, -7544, -7673]]
                    }, {
                        "type": "Polygon",
                        "id": 13303,
                        "arcs": [[-7815, -7814, -7819, 7836, 7837, 7838, -7723]]
                    }, {
                        "type": "Polygon",
                        "id": 13199,
                        "arcs": [[-7808, 7839, 7840, 7841, 7842, 7843, -7690]]
                    }, {
                        "type": "Polygon",
                        "id": 13285,
                        "arcs": [[-7844, 7844, 7845, -7700, -7748, -7691]]
                    }, {
                        "type": "Polygon",
                        "id": 35017,
                        "arcs": [[-7718, 7846, 7847, -7592, -7176]]
                    }, {
                        "type": "Polygon",
                        "id": 13231,
                        "arcs": [[7848, 7849, -7840, -7807]]
                    }, {
                        "type": "Polygon",
                        "id": 13171,
                        "arcs": [[7850, 7851, -7849, -7806, -7737]]
                    }, {
                        "type": "Polygon",
                        "id": 13207,
                        "arcs": [[-7687, 7852, 7853, 7854, 7855, -7851, -7736]]
                    }, {
                        "type": "Polygon",
                        "id": 13009,
                        "arcs": [[-7724, -7839, 7856, 7857, -7713]]
                    }, {
                        "type": "Polygon",
                        "id": 13169,
                        "arcs": [[-7858, 7858, 7859, 7860, -7853, -7686, -7714]]
                    }, {
                        "type": "Polygon",
                        "id": 45029,
                        "arcs": [[-7810, 7861, 7862, 7863, 7864, -7739, -7616]]
                    }, {
                        "type": "Polygon",
                        "id": 45005,
                        "arcs": [[-7740, 7865, 7866, 7867, -7822, -7710]]
                    }, {
                        "type": "Polygon",
                        "id": 1063,
                        "arcs": [[7868, 7869, 7870, -7677, -7652]]
                    }, {
                        "type": "Polygon",
                        "id": 1017,
                        "arcs": [[-7846, 7871, 7872, 7873, -7701]]
                    }, {
                        "type": "Polygon",
                        "id": 1123,
                        "arcs": [[-7874, 7874, 7875, 7876, 7877, -7704, -7702]]
                    }, {
                        "type": "Polygon",
                        "id": 1037,
                        "arcs": [[-7878, 7878, 7879, -7671, -7624, -7705]]
                    }, {
                        "type": "Polygon",
                        "id": 28125,
                        "arcs": [[-7812, 7880, 7881, -7683]]
                    }, {
                        "type": "Polygon",
                        "id": 48063,
                        "arcs": [[-7802, 7882, 7883, -7792, -7765]]
                    }, {
                        "type": "Polygon",
                        "id": 1021,
                        "arcs": [[-7880, 7884, 7885, 7886, 7887, -7834, -7672]]
                    }, {
                        "type": "Polygon",
                        "id": 35013,
                        "arcs": [[7888, 7889, 7890, -7716, -7787]]
                    }, {
                        "type": "Polygon",
                        "id": 13251,
                        "arcs": [[-7867, 7891, 7892, 7893, 7894, 7895, -7823, -7868]]
                    }, {
                        "type": "Polygon",
                        "id": 45049,
                        "arcs": [[7896, 7897, 7898, -7892, -7866, -7865]]
                    }, {
                        "type": "Polygon",
                        "id": 28163,
                        "arcs": [[7899, 7900, 7901, 7902, 7903, -7881, -7811, -7804]]
                    }, {
                        "type": "Polygon",
                        "id": 22017,
                        "arcs": [[7904, 7905, 7906, 7907, 7908, -7820, -7645, 7909]]
                    }, {
                        "type": "Polygon",
                        "id": 22015,
                        "arcs": [[7910, 7911, 7912, -7910, -7644, -7721]]
                    }, {
                        "type": "Polygon",
                        "id": 22119,
                        "arcs": [[7913, -7911, -7720, -7735, 7914]]
                    }, {
                        "type": "Polygon",
                        "id": 22027,
                        "arcs": [[7915, 7916, -7915, -7734, -7796, 7917]]
                    }, {
                        "type": "Polygon",
                        "id": 22111,
                        "arcs": [[7918, 7919, -7918, -7795, 7920]]
                    }, {
                        "type": "Polygon",
                        "id": 48499,
                        "arcs": [[7921, 7922, 7923, 7924, 7925, -7797, -7793, -7884]]
                    }, {
                        "type": "Polygon",
                        "id": 28055,
                        "arcs": [[-7882, -7904, 7926, 7927, -7664, -7684]]
                    }, {
                        "type": "Polygon",
                        "id": 13319,
                        "arcs": [[-7838, 7928, 7929, 7930, -7859, -7857]]
                    }, {
                        "type": "Polygon",
                        "id": 22067,
                        "arcs": [[-7667, 7931, 7932, 7933, -7921, -7778]]
                    }, {
                        "type": "Polygon",
                        "id": 1065,
                        "arcs": [[-7836, 7934, 7935, -7869, -7651]]
                    }, {
                        "type": "Polygon",
                        "id": 22123,
                        "arcs": [[7936, 7937, -7932, -7666]]
                    }, {
                        "type": "Polygon",
                        "id": 48363,
                        "arcs": [[7938, 7939, 7940, 7941, 7942, -7774, -7731]]
                    }, {
                        "type": "Polygon",
                        "id": 22035,
                        "arcs": [[7943, 7944, 7945, -7937, -7665, -7928]]
                    }, {
                        "type": "Polygon",
                        "id": 48367,
                        "arcs": [[7946, 7947, 7948, -7939, -7730, -7744]]
                    }, {
                        "type": "Polygon",
                        "id": 13293,
                        "arcs": [[-7852, -7856, 7949, 7950, 7951, -7841, -7850]]
                    }, {
                        "type": "Polygon",
                        "id": 1119,
                        "arcs": [[7952, 7953, 7954, 7955, -7826, -7678, -7871]]
                    }, {
                        "type": "Polygon",
                        "id": 48439,
                        "arcs": [[-7743, -7747, 7956, 7957, 7958, -7947]]
                    }, {
                        "type": "Polygon",
                        "id": 48113,
                        "arcs": [[-7756, 7959, 7960, 7961, -7957, -7746]]
                    }, {
                        "type": "Polygon",
                        "id": 48397,
                        "arcs": [[-7752, 7962, -7960, -7755]]
                    }, {
                        "type": "Polygon",
                        "id": 48379,
                        "arcs": [[-7926, 7963, -7749, -7798]]
                    }, {
                        "type": "Polygon",
                        "id": 48415,
                        "arcs": [[7964, 7965, 7966, -7767, -7759]]
                    }, {
                        "type": "Polygon",
                        "id": 35015,
                        "arcs": [[-7659, 7967, 7968, 7969, -7783, -7426]]
                    }, {
                        "type": "Polygon",
                        "id": 48151,
                        "arcs": [[-7763, 7970, 7971, -7965, -7758]]
                    }, {
                        "type": "Polygon",
                        "id": 48033,
                        "arcs": [[-7967, 7972, 7973, 7974, -7780, -7768]]
                    }, {
                        "type": "Polygon",
                        "id": 48115,
                        "arcs": [[-7975, 7975, 7976, -7790, -7781]]
                    }, {
                        "type": "Polygon",
                        "id": 48165,
                        "arcs": [[-7791, -7977, 7977, 7978, -7655, -7789]]
                    }, {
                        "type": "Polygon",
                        "id": 48253,
                        "arcs": [[-7777, 7979, 7980, 7981, -7971, -7762]]
                    }, {
                        "type": "Polygon",
                        "id": 48417,
                        "arcs": [[7982, 7983, 7984, -7980, -7776, -7772]]
                    }, {
                        "type": "Polygon",
                        "id": 48429,
                        "arcs": [[-7943, 7985, -7983, -7771, -7775]]
                    }, {
                        "type": "Polygon",
                        "id": 13165,
                        "arcs": [[-7896, 7986, 7987, -7824]]
                    }, {
                        "type": "Polygon",
                        "id": 13021,
                        "arcs": [[7988, 7989, 7990, 7991, -7854, -7861]]
                    }, {
                        "type": "Polygon",
                        "id": 28099,
                        "arcs": [[7992, 7993, 7994, -7830]]
                    }, {
                        "type": "Polygon",
                        "id": 28079,
                        "arcs": [[-7995, 7995, 7996, 7997, -7832]]
                    }, {
                        "type": "Polygon",
                        "id": 28069,
                        "arcs": [[-7956, 7998, -7993, -7829, -7827]]
                    }, {
                        "type": "Polygon",
                        "id": 48459,
                        "arcs": [[-7801, 7999, 8000, 8001, 8002, -7922, -7883]]
                    }, {
                        "type": "Polygon",
                        "id": 13289,
                        "arcs": [[8003, 8004, -7990, -7989, -7860, -7931]]
                    }, {
                        "type": "Polygon",
                        "id": 13263,
                        "arcs": [[8005, 8006, 8007, 8008, 8009, -7842, -7952]]
                    }, {
                        "type": "Polygon",
                        "id": 48315,
                        "arcs": [[-7909, 8010, -8000, -7800, -7821]]
                    }, {
                        "type": "Polygon",
                        "id": 28089,
                        "arcs": [[-7998, 8011, 8012, 8013, -7901, -7900, -7833]]
                    }, {
                        "type": "Polygon",
                        "id": 1105,
                        "arcs": [[-7888, 8014, 8015, -7935, -7835]]
                    }, {
                        "type": "Polygon",
                        "id": 13145,
                        "arcs": [[-8010, 8016, 8017, -7872, -7845, -7843]]
                    }, {
                        "type": "Polygon",
                        "id": 13079,
                        "arcs": [[-7992, 8018, 8019, 8020, -7950, -7855]]
                    }, {
                        "type": "Polygon",
                        "id": 48257,
                        "arcs": [[8021, 8022, 8023, -7961, -7963, -7751]]
                    }, {
                        "type": "Polygon",
                        "id": 13107,
                        "arcs": [[-7825, -7988, 8024, 8025, 8026, 8027, 8028, 8029, -7817]]
                    }, {
                        "type": "Polygon",
                        "id": 48467,
                        "arcs": [[-7964, -7925, 8030, 8031, -8022, -7750]]
                    }, {
                        "type": "Polygon",
                        "id": 13167,
                        "arcs": [[-8030, 8032, -7929, -7837, -7818]]
                    }, {
                        "type": "Polygon",
                        "id": 48203,
                        "arcs": [[-7908, 8033, 8034, 8035, -8001, -8011]]
                    }, {
                        "type": "Polygon",
                        "id": 35023,
                        "arcs": [[8036, 8037, 8038, -7593, -7848]]
                    }, {
                        "type": "Polygon",
                        "id": 1051,
                        "arcs": [[8039, 8040, 8041, -7885, -7879, -7877]]
                    }, {
                        "type": "Polygon",
                        "id": 22061,
                        "arcs": [[8042, 8043, 8044, -7916, -7920]]
                    }, {
                        "type": "Polygon",
                        "id": 45053,
                        "arcs": [[8045, 8046, 8047, 8048, 8049, 8050, 8051, 8052, 8053, 8054, 8055, 8056, -7898]]
                    }, {
                        "type": "Polygon",
                        "id": 13269,
                        "arcs": [[-8021, 8057, 8058, 8059, 8060, -8006, -7951]]
                    }, {
                        "type": "Polygon",
                        "id": 1081,
                        "arcs": [[-8018, 8061, 8062, 8063, -7875, -7873]]
                    }, {
                        "type": "Polygon",
                        "id": 1047,
                        "arcs": [[8064, 8065, 8066, 8067, -8015, -7887]]
                    }, {
                        "type": "Polygon",
                        "id": 22073,
                        "arcs": [[8068, 8069, 8070, -8043, -7919, -7934]]
                    }, {
                        "type": "Polygon",
                        "id": 13175,
                        "arcs": [[8071, 8072, 8073, -7930, -8033, 8074]]
                    }, {
                        "type": "Polygon",
                        "id": 1001,
                        "arcs": [[-8042, 8075, 8076, -8065, -7886]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 45013,
                        "arcs": [[[8077]], [[-8053, -8052, 8078]], [[8079]], [[8080]], [[8081, -8046, -7897, -7864]]]
                    }, {
                        "type": "Polygon",
                        "id": 13225,
                        "arcs": [[8082, -8058, -8020, 8083]]
                    }, {
                        "type": "Polygon",
                        "id": 13153,
                        "arcs": [[-8005, 8084, 8085, 8086, 8087, -8084, -8019, -7991]]
                    }, {
                        "type": "Polygon",
                        "id": 48423,
                        "arcs": [[-7923, -8003, 8088, 8089, 8090, 8091, -8031, -7924]]
                    }, {
                        "type": "Polygon",
                        "id": 22083,
                        "arcs": [[-7946, 8092, 8093, 8094, -8069, -7933, -7938]]
                    }, {
                        "type": "Polygon",
                        "id": 48183,
                        "arcs": [[-8036, 8095, -8089, -8002]]
                    }, {
                        "type": "Polygon",
                        "id": 13031,
                        "arcs": [[-7894, 8096, 8097, 8098, 8099, -8025, -7987, -7895]]
                    }, {
                        "type": "Polygon",
                        "id": 28123,
                        "arcs": [[-7997, 8100, 8101, 8102, -8012]]
                    }, {
                        "type": "Polygon",
                        "id": 28149,
                        "arcs": [[8103, 8104, 8105, 8106, 8107, 8108, -7944, -7927, -7903]]
                    }, {
                        "type": "Polygon",
                        "id": 13215,
                        "arcs": [[-8009, 8109, 8110, -8062, -8017]]
                    }, {
                        "type": "Polygon",
                        "id": 35029,
                        "arcs": [[-7891, 8111, -8037, -7847, -7717]]
                    }, {
                        "type": "Polygon",
                        "id": 13103,
                        "arcs": [[-8057, -8056, 8112, 8113, -8097, -7893, -7899]]
                    }, {
                        "type": "Polygon",
                        "id": 1087,
                        "arcs": [[8114, 8115, 8116, 8117, -8040, -7876, -8064]]
                    }, {
                        "type": "Polygon",
                        "id": 28121,
                        "arcs": [[-8103, 8118, 8119, 8120, -8013]]
                    }, {
                        "type": "Polygon",
                        "id": 22013,
                        "arcs": [[-8045, 8121, 8122, 8123, 8124, -7912, -7914, -7917]]
                    }, {
                        "type": "Polygon",
                        "id": 13023,
                        "arcs": [[8125, 8126, -8085, -8004, -8074]]
                    }, {
                        "type": "Polygon",
                        "id": 28075,
                        "arcs": [[-7955, 8127, 8128, 8129, -7999]]
                    }, {
                        "type": "Polygon",
                        "id": 28101,
                        "arcs": [[-8130, 8130, -8101, -7996, -7994]]
                    }, {
                        "type": "Polygon",
                        "id": 28049,
                        "arcs": [[-8121, 8131, 8132, -8104, -7902, -8014]]
                    }, {
                        "type": "Polygon",
                        "id": 22065,
                        "arcs": [[8133, 8134, -8093, -7945, -8109]]
                    }, {
                        "type": "Polygon",
                        "id": 13197,
                        "arcs": [[8135, 8136, 8137, 8138, 8139, -8007, -8061]]
                    }, {
                        "type": "Polygon",
                        "id": 13043,
                        "arcs": [[8140, 8141, -8026, -8100]]
                    }, {
                        "type": "Polygon",
                        "id": 48221,
                        "arcs": [[8142, 8143, 8144, -7940, -7949]]
                    }, {
                        "type": "Polygon",
                        "id": 48251,
                        "arcs": [[8145, 8146, 8147, 8148, -8143, -7948, -7959]]
                    }, {
                        "type": "Polygon",
                        "id": 48139,
                        "arcs": [[-7962, -8024, 8149, 8150, 8151, -8146, -7958]]
                    }, {
                        "type": "Polygon",
                        "id": 1091,
                        "arcs": [[-7936, -8016, -8068, 8152, 8153, 8154, -7953, -7870]]
                    }, {
                        "type": "Polygon",
                        "id": 13053,
                        "arcs": [[-8140, 8155, 8156, -8110, -8008]]
                    }, {
                        "type": "Polygon",
                        "id": 48227,
                        "arcs": [[8157, 8158, 8159, 8160, -7974]]
                    }, {
                        "type": "Polygon",
                        "id": 48335,
                        "arcs": [[8161, 8162, 8163, -8158, -7973, -7966]]
                    }, {
                        "type": "Polygon",
                        "id": 48353,
                        "arcs": [[8164, 8165, 8166, -8162, -7972]]
                    }, {
                        "type": "Polygon",
                        "id": 48317,
                        "arcs": [[-8161, 8167, 8168, 8169, -7978, -7976]]
                    }, {
                        "type": "Polygon",
                        "id": 48003,
                        "arcs": [[-8170, 8170, 8171, 8172, -7656, -7979]]
                    }, {
                        "type": "Polygon",
                        "id": 13193,
                        "arcs": [[-8083, -8088, 8173, 8174, 8175, -8059]]
                    }, {
                        "type": "Polygon",
                        "id": 48441,
                        "arcs": [[8176, 8177, 8178, -8165, -7982]]
                    }, {
                        "type": "Polygon",
                        "id": 48133,
                        "arcs": [[-7942, 8179, 8180, 8181, 8182, -7984, -7986]]
                    }, {
                        "type": "Polygon",
                        "id": 48143,
                        "arcs": [[-7941, -8145, 8183, 8184, 8185, 8186, -8180]]
                    }, {
                        "type": "Polygon",
                        "id": 48059,
                        "arcs": [[-8183, 8187, 8188, -8177, -7981, -7985]]
                    }, {
                        "type": "Polygon",
                        "id": 4019,
                        "arcs": [[-7636, 8189, 8190, 8191, -7725, -7456, -7728]]
                    }, {
                        "type": "Polygon",
                        "id": 13283,
                        "arcs": [[8192, 8193, -8075, -8029]]
                    }, {
                        "type": "Polygon",
                        "id": 1113,
                        "arcs": [[-8111, -8157, 8194, 8195, 8196, -8115, -8063]]
                    }, {
                        "type": "Polygon",
                        "id": 1101,
                        "arcs": [[-8118, -8117, 8197, 8198, 8199, 8200, -8076, -8041]]
                    }, {
                        "type": "Polygon",
                        "id": 22049,
                        "arcs": [[-8071, 8201, 8202, -8122, -8044]]
                    }, {
                        "type": "Polygon",
                        "id": 13091,
                        "arcs": [[8203, 8204, 8205, 8206, -8126, -8073]]
                    }, {
                        "type": "Polygon",
                        "id": 13249,
                        "arcs": [[-8176, 8207, -8136, -8060]]
                    }, {
                        "type": "Polygon",
                        "id": 4003,
                        "arcs": [[-7594, -8039, 8208, 8209, -8190, -7635]]
                    }, {
                        "type": "Polygon",
                        "id": 1085,
                        "arcs": [[-8201, 8210, 8211, 8212, -8066, -8077]]
                    }, {
                        "type": "Polygon",
                        "id": 48401,
                        "arcs": [[8213, 8214, 8215, 8216, -8090, -8096, -8035]]
                    }, {
                        "type": "Polygon",
                        "id": 22041,
                        "arcs": [[-8135, 8217, 8218, 8219, -8094]]
                    }, {
                        "type": "Polygon",
                        "id": 13235,
                        "arcs": [[-8127, -8207, 8220, 8221, -8086]]
                    }, {
                        "type": "Polygon",
                        "id": 48365,
                        "arcs": [[-7907, 8222, 8223, -8214, -8034]]
                    }, {
                        "type": "Polygon",
                        "id": 48213,
                        "arcs": [[-8032, -8092, 8224, 8225, 8226, 8227, -8150, -8023]]
                    }, {
                        "type": "Polygon",
                        "id": 13209,
                        "arcs": [[8228, 8229, -8193, 8230]]
                    }, {
                        "type": "Polygon",
                        "id": 13279,
                        "arcs": [[-8028, 8231, 8232, 8233, -8231]]
                    }, {
                        "type": "Polygon",
                        "id": 22031,
                        "arcs": [[8234, 8235, 8236, 8237, -8223, -7906]]
                    }, {
                        "type": "Polygon",
                        "id": 48349,
                        "arcs": [[8238, 8239, 8240, -8151, -8228]]
                    }, {
                        "type": "Polygon",
                        "id": 48425,
                        "arcs": [[-8149, 8241, -8184, -8144]]
                    }, {
                        "type": "Polygon",
                        "id": 13267,
                        "arcs": [[8242, 8243, 8244, 8245, 8246, -8232, -8027, -8142]]
                    }, {
                        "type": "Polygon",
                        "id": 1023,
                        "arcs": [[8247, 8248, 8249, 8250, -8128, -7954, -8155]]
                    }, {
                        "type": "Polygon",
                        "id": 13309,
                        "arcs": [[-8230, 8251, 8252, -8204, -8072, -8194]]
                    }, {
                        "type": "Polygon",
                        "id": 1011,
                        "arcs": [[-8197, 8253, 8254, -8198, -8116]]
                    }, {
                        "type": "Polygon",
                        "id": 13093,
                        "arcs": [[-8222, 8255, 8256, 8257, 8258, -8174, -8087]]
                    }, {
                        "type": "Polygon",
                        "id": 13109,
                        "arcs": [[-8099, 8259, 8260, -8243, -8141]]
                    }, {
                        "type": "Polygon",
                        "id": 22021,
                        "arcs": [[-8095, -8220, 8261, 8262, 8263, -8202, -8070]]
                    }, {
                        "type": "Polygon",
                        "id": 1131,
                        "arcs": [[-8067, -8213, 8264, 8265, 8266, -8153]]
                    }, {
                        "type": "Polygon",
                        "id": 48217,
                        "arcs": [[-8241, 8267, 8268, 8269, -8147, -8152]]
                    }, {
                        "type": "Polygon",
                        "id": 48093,
                        "arcs": [[8270, 8271, 8272, -8181, -8187]]
                    }, {
                        "type": "Polygon",
                        "id": 22107,
                        "arcs": [[-8108, 8273, -8106, 8274, 8275, 8276, 8277, 8278, -8218, -8134]]
                    }, {
                        "type": "Polygon",
                        "id": 13029,
                        "arcs": [[8279, 8280, 8281, -8260, -8098, -8114]]
                    }, {
                        "type": "Polygon",
                        "id": 22081,
                        "arcs": [[-7913, -8125, 8282, -8235, -7905]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 13051,
                        "arcs": [[[8283]], [[8284]], [[8285, -8280, -8113, -8055]]]
                    }, {
                        "type": "Polygon",
                        "id": 13307,
                        "arcs": [[8286, 8287, 8288, 8289, -8138]]
                    }, {
                        "type": "Polygon",
                        "id": 13259,
                        "arcs": [[-8290, 8290, 8291, 8292, -8195, -8156, -8139]]
                    }, {
                        "type": "Polygon",
                        "id": 13261,
                        "arcs": [[-8259, -8258, 8293, 8294, 8295, -8287, -8137, -8208, -8175]]
                    }, {
                        "type": "Polygon",
                        "id": 28023,
                        "arcs": [[-8251, 8296, 8297, -8129]]
                    }, {
                        "type": "Polygon",
                        "id": 28021,
                        "arcs": [[-8133, 8298, 8299, -8275, -8105]]
                    }, {
                        "type": "Polygon",
                        "id": 28061,
                        "arcs": [[-8298, 8300, 8301, 8302, -8131]]
                    }, {
                        "type": "Polygon",
                        "id": 28129,
                        "arcs": [[-8303, 8303, 8304, 8305, -8119, -8102]]
                    }, {
                        "type": "Polygon",
                        "id": 48035,
                        "arcs": [[-8148, -8270, 8306, 8307, 8308, -8185, -8242]]
                    }, {
                        "type": "Polygon",
                        "id": 13271,
                        "arcs": [[8309, 8310, 8311, 8312, -8205, -8253]]
                    }, {
                        "type": "Polygon",
                        "id": 22127,
                        "arcs": [[-8203, -8264, 8313, 8314, 8315, -8123]]
                    }, {
                        "type": "Polygon",
                        "id": 22069,
                        "arcs": [[-8316, 8316, 8317, 8318, 8319, -8236, -8283, -8124]]
                    }, {
                        "type": "Polygon",
                        "id": 1005,
                        "arcs": [[-8293, 8320, 8321, 8322, 8323, 8324, 8325, -8254, -8196]]
                    }, {
                        "type": "Polygon",
                        "id": 48073,
                        "arcs": [[-8217, 8326, 8327, 8328, 8329, -8225, -8091]]
                    }, {
                        "type": "Polygon",
                        "id": 13315,
                        "arcs": [[-8206, -8313, 8330, 8331, 8332, -8256, -8221]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 13179,
                        "arcs": [[[8333]], [[8334, 8335, -8244, -8261, -8282, 8336]]]
                    }, {
                        "type": "Polygon",
                        "id": 48431,
                        "arcs": [[-8164, 8337, 8338, 8339, 8340, -8159]]
                    }, {
                        "type": "Polygon",
                        "id": 48173,
                        "arcs": [[-8341, 8341, 8342, -8168, -8160]]
                    }, {
                        "type": "Polygon",
                        "id": 48329,
                        "arcs": [[-8343, 8343, 8344, -8171, -8169]]
                    }, {
                        "type": "Polygon",
                        "id": 48135,
                        "arcs": [[-8345, 8345, 8346, 8347, 8348, -8172]]
                    }, {
                        "type": "Polygon",
                        "id": 48495,
                        "arcs": [[-8349, 8349, 8350, -7657, -8173]]
                    }, {
                        "type": "Polygon",
                        "id": 48081,
                        "arcs": [[-8167, 8351, 8352, -8338, -8163]]
                    }, {
                        "type": "Polygon",
                        "id": 48001,
                        "arcs": [[8353, 8354, 8355, -8226, -8330]]
                    }, {
                        "type": "Polygon",
                        "id": 48083,
                        "arcs": [[-8189, 8356, 8357, 8358, 8359, -8178]]
                    }, {
                        "type": "Polygon",
                        "id": 48399,
                        "arcs": [[-8360, 8360, 8361, -8352, -8166, -8179]]
                    }, {
                        "type": "Polygon",
                        "id": 48049,
                        "arcs": [[-8273, 8362, 8363, 8364, -8357, -8188, -8182]]
                    }, {
                        "type": "Polygon",
                        "id": 1109,
                        "arcs": [[-8326, -8325, 8365, 8366, 8367, -8199, -8255]]
                    }, {
                        "type": "Polygon",
                        "id": 1041,
                        "arcs": [[-8368, 8368, 8369, 8370, -8211, -8200]]
                    }, {
                        "type": "Polygon",
                        "id": 28029,
                        "arcs": [[8371, 8372, 8373, 8374, -8299, -8132]]
                    }, {
                        "type": "Polygon",
                        "id": 28127,
                        "arcs": [[-8306, 8375, 8376, 8377, -8372, -8120]]
                    }, {
                        "type": "Polygon",
                        "id": 13081,
                        "arcs": [[-8333, 8378, 8379, 8380, -8294, -8257]]
                    }, {
                        "type": "Polygon",
                        "id": 48193,
                        "arcs": [[8381, -8271, -8186, -8309, 8382, 8383]]
                    }, {
                        "type": "Polygon",
                        "id": 13183,
                        "arcs": [[8384, 8385, -8245, -8336]]
                    }, {
                        "type": "Polygon",
                        "id": 48161,
                        "arcs": [[8386, 8387, -8239, -8227, -8356]]
                    }, {
                        "type": "Polygon",
                        "id": 48109,
                        "arcs": [[8388, 8389, 8390, -7784, -7970]]
                    }, {
                        "type": "Polygon",
                        "id": 48229,
                        "arcs": [[8391, 8392, 8393, -7785, -8391]]
                    }, {
                        "type": "Polygon",
                        "id": 48141,
                        "arcs": [[8394, -7889, -7786, -8394]]
                    }, {
                        "type": "Polygon",
                        "id": 48301,
                        "arcs": [[8395, 8396, -7968, -7658, -8351]]
                    }, {
                        "type": "Polygon",
                        "id": 48389,
                        "arcs": [[8397, 8398, 8399, -8389, -7969, -8397]]
                    }, {
                        "type": "Polygon",
                        "id": 13239,
                        "arcs": [[8400, 8401, -8321, -8292]]
                    }, {
                        "type": "Polygon",
                        "id": 1025,
                        "arcs": [[-8267, 8402, 8403, 8404, -8248, -8154]]
                    }, {
                        "type": "Polygon",
                        "id": 48419,
                        "arcs": [[8405, 8406, 8407, 8408, -8215, -8224, -8238]]
                    }, {
                        "type": "Polygon",
                        "id": 22025,
                        "arcs": [[-8279, 8409, 8410, 8411, -8262, -8219]]
                    }, {
                        "type": "Polygon",
                        "id": 13161,
                        "arcs": [[8412, 8413, 8414, -8310, -8252, -8229, -8234]]
                    }, {
                        "type": "Polygon",
                        "id": 13273,
                        "arcs": [[8415, 8416, 8417, 8418, -8288, -8296]]
                    }, {
                        "type": "Polygon",
                        "id": 13001,
                        "arcs": [[-8247, 8419, 8420, 8421, -8413, -8233]]
                    }, {
                        "type": "Polygon",
                        "id": 1013,
                        "arcs": [[-8371, 8422, 8423, 8424, -8265, -8212]]
                    }, {
                        "type": "Polygon",
                        "id": 13243,
                        "arcs": [[-8289, -8419, 8425, 8426, -8401, -8291]]
                    }, {
                        "type": "Polygon",
                        "id": 22059,
                        "arcs": [[-8412, 8427, 8428, 8429, -8314, -8263]]
                    }, {
                        "type": "Polygon",
                        "id": 13177,
                        "arcs": [[-8381, 8430, 8431, -8416, -8295]]
                    }, {
                        "type": "Polygon",
                        "id": 28153,
                        "arcs": [[8432, 8433, 8434, -8301, -8297, -8250, 8435]]
                    }, {
                        "type": "Polygon",
                        "id": 28063,
                        "arcs": [[-8375, 8436, 8437, 8438, -8276, -8300]]
                    }, {
                        "type": "Polygon",
                        "id": 48309,
                        "arcs": [[8439, -8307, -8269, 8440, 8441, 8442]]
                    }, {
                        "type": "Polygon",
                        "id": 13287,
                        "arcs": [[8443, 8444, 8445, 8446, -8379, -8332]]
                    }, {
                        "type": "Polygon",
                        "id": 13017,
                        "arcs": [[-8312, 8447, 8448, -8444, -8331]]
                    }, {
                        "type": "Polygon",
                        "id": 13321,
                        "arcs": [[-8380, -8447, 8449, 8450, 8451, 8452, -8431]]
                    }, {
                        "type": "Polygon",
                        "id": 48347,
                        "arcs": [[-8409, 8453, 8454, -8327, -8216]]
                    }, {
                        "type": "Polygon",
                        "id": 22085,
                        "arcs": [[-8320, 8455, 8456, 8457, -8406, -8237]]
                    }, {
                        "type": "Polygon",
                        "id": 13305,
                        "arcs": [[-8246, -8386, 8458, 8459, 8460, 8461, -8420]]
                    }, {
                        "type": "Polygon",
                        "id": 1099,
                        "arcs": [[-8425, 8462, 8463, 8464, -8403, -8266]]
                    }, {
                        "type": "Polygon",
                        "id": 28067,
                        "arcs": [[8465, 8466, 8467, -8304, -8302, -8435]]
                    }, {
                        "type": "Polygon",
                        "id": 48293,
                        "arcs": [[8468, -8441, -8268, -8240, -8388, 8469, 8470]]
                    }, {
                        "type": "Polygon",
                        "id": 13069,
                        "arcs": [[8471, 8472, 8473, 8474, 8475, -8448, -8311, -8415]]
                    }, {
                        "type": "Polygon",
                        "id": 22043,
                        "arcs": [[-8430, 8476, -8317, -8315]]
                    }, {
                        "type": "Polygon",
                        "id": 28031,
                        "arcs": [[-8468, 8477, 8478, 8479, -8376, -8305]]
                    }, {
                        "type": "Polygon",
                        "id": 13061,
                        "arcs": [[-8427, 8480, 8481, 8482, -8322, -8402]]
                    }, {
                        "type": "Polygon",
                        "id": 1067,
                        "arcs": [[-8483, 8483, 8484, 8485, -8323]]
                    }, {
                        "type": "Polygon",
                        "id": 28065,
                        "arcs": [[8486, 8487, 8488, -8377, -8480]]
                    }, {
                        "type": "Polygon",
                        "id": 13155,
                        "arcs": [[-8476, 8489, 8490, -8445, -8449]]
                    }, {
                        "type": "Polygon",
                        "id": 22029,
                        "arcs": [[-8278, 8491, 8492, 8493, 8494, 8495, 8496, -8410]]
                    }, {
                        "type": "Polygon",
                        "id": 28077,
                        "arcs": [[8497, 8498, 8499, -8373, -8378, -8489]]
                    }, {
                        "type": "Polygon",
                        "id": 1035,
                        "arcs": [[8500, 8501, -8463, -8424]]
                    }, {
                        "type": "Polygon",
                        "id": 28001,
                        "arcs": [[8502, 8503, -8492, -8277, -8439]]
                    }, {
                        "type": "Polygon",
                        "id": 4023,
                        "arcs": [[-8210, 8504, -8191]]
                    }, {
                        "type": "Polygon",
                        "id": 48333,
                        "arcs": [[8505, 8506, -8363, -8272, -8382]]
                    }, {
                        "type": "Polygon",
                        "id": 28085,
                        "arcs": [[8507, 8508, 8509, 8510, -8437, -8374, -8500]]
                    }, {
                        "type": "Polygon",
                        "id": 13005,
                        "arcs": [[8511, 8512, -8472, -8414, -8422]]
                    }, {
                        "type": "Polygon",
                        "id": 48099,
                        "arcs": [[8513, -8383, -8308, -8440, 8514]]
                    }, {
                        "type": "Polygon",
                        "id": 48451,
                        "arcs": [[-8362, 8515, 8516, 8517, 8518, -8339, -8353]]
                    }, {
                        "type": "Polygon",
                        "id": 1129,
                        "arcs": [[-8405, 8519, 8520, 8521, -8436, -8249]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 13191,
                        "arcs": [[[8522]], [[8523, 8524, -8459, -8385, -8335]]]
                    }, {
                        "type": "Polygon",
                        "id": 48289,
                        "arcs": [[8525, 8526, 8527, -8470, -8387, -8355]]
                    }, {
                        "type": "Polygon",
                        "id": 48461,
                        "arcs": [[8528, 8529, 8530, -8346, -8344]]
                    }, {
                        "type": "Polygon",
                        "id": 48103,
                        "arcs": [[-8531, 8531, 8532, 8533, -8347]]
                    }, {
                        "type": "Polygon",
                        "id": 48405,
                        "arcs": [[8534, 8535, 8536, -8454, -8408]]
                    }, {
                        "type": "Polygon",
                        "id": 48383,
                        "arcs": [[-8340, -8519, 8537, 8538, -8529, -8342]]
                    }, {
                        "type": "Polygon",
                        "id": 48475,
                        "arcs": [[-8396, -8350, -8348, -8534, 8539, -8398]]
                    }, {
                        "type": "Polygon",
                        "id": 13095,
                        "arcs": [[-8453, 8540, 8541, 8542, -8417, -8432]]
                    }, {
                        "type": "Polygon",
                        "id": 13037,
                        "arcs": [[-8418, -8543, 8543, 8544, -8481, -8426]]
                    }, {
                        "type": "Polygon",
                        "id": 1045,
                        "arcs": [[-8486, 8545, 8546, 8547, -8366, -8324]]
                    }, {
                        "type": "Polygon",
                        "id": 1031,
                        "arcs": [[8548, 8549, -8369, -8367, -8548]]
                    }, {
                        "type": "Polygon",
                        "id": 28037,
                        "arcs": [[-8511, 8550, 8551, -8503, -8438]]
                    }, {
                        "type": "Polygon",
                        "id": 48403,
                        "arcs": [[-8458, 8552, 8553, -8535, -8407]]
                    }, {
                        "type": "Polygon",
                        "id": 13277,
                        "arcs": [[-8491, 8554, 8555, 8556, -8450, -8446]]
                    }, {
                        "type": "Polygon",
                        "id": 48225,
                        "arcs": [[8557, 8558, 8559, 8560, -8526, -8354, -8329]]
                    }, {
                        "type": "Polygon",
                        "id": 48095,
                        "arcs": [[-8359, 8561, 8562, -8516, -8361]]
                    }, {
                        "type": "Polygon",
                        "id": 13229,
                        "arcs": [[-8462, 8563, 8564, -8512, -8421]]
                    }, {
                        "type": "Polygon",
                        "id": 1039,
                        "arcs": [[-8550, 8565, 8566, 8567, 8568, -8501, -8423, -8370]]
                    }, {
                        "type": "Polygon",
                        "id": 48235,
                        "arcs": [[8569, 8570, -8538, -8518]]
                    }, {
                        "type": "Polygon",
                        "id": 48005,
                        "arcs": [[-8537, 8571, 8572, 8573, 8574, -8558, -8328, -8455]]
                    }, {
                        "type": "Polygon",
                        "id": 13099,
                        "arcs": [[-8545, 8575, 8576, 8577, 8578, -8484, -8482]]
                    }, {
                        "type": "Polygon",
                        "id": 48145,
                        "arcs": [[8579, 8580, -8442, -8469, 8581]]
                    }, {
                        "type": "Polygon",
                        "id": 22079,
                        "arcs": [[-8429, 8582, 8583, 8584, 8585, -8318, -8477]]
                    }, {
                        "type": "Polygon",
                        "id": 48307,
                        "arcs": [[-8365, 8586, 8587, 8588, -8562, -8358]]
                    }, {
                        "type": "Polygon",
                        "id": 48411,
                        "arcs": [[-8507, 8589, 8590, 8591, 8592, -8587, -8364]]
                    }, {
                        "type": "Polygon",
                        "id": 13019,
                        "arcs": [[-8475, 8593, 8594, 8595, 8596, -8555, -8490]]
                    }, {
                        "type": "Polygon",
                        "id": 13299,
                        "arcs": [[-8565, 8597, 8598, 8599, 8600, 8601, 8602, -8473, -8513]]
                    }, {
                        "type": "Polygon",
                        "id": 48281,
                        "arcs": [[8603, 8604, -8590, -8506, -8384, -8514]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 13127,
                        "arcs": [[[8605, 8606]], [[8607, 8608, 8609, 8610, 8611, -8460, -8525]]]
                    }, {
                        "type": "Polygon",
                        "id": 13007,
                        "arcs": [[-8542, 8612, 8613, 8614, -8576, -8544]]
                    }, {
                        "type": "Polygon",
                        "id": 13205,
                        "arcs": [[-8452, 8615, 8616, 8617, 8618, -8613, -8541]]
                    }, {
                        "type": "Polygon",
                        "id": 28041,
                        "arcs": [[-8522, 8619, 8620, 8621, -8433]]
                    }, {
                        "type": "Polygon",
                        "id": 28035,
                        "arcs": [[8622, 8623, 8624, 8625, -8478, -8467]]
                    }, {
                        "type": "Polygon",
                        "id": 28073,
                        "arcs": [[-8479, -8626, 8626, 8627, -8487]]
                    }, {
                        "type": "Polygon",
                        "id": 28111,
                        "arcs": [[-8434, -8622, 8628, 8629, -8623, -8466]]
                    }, {
                        "type": "Polygon",
                        "id": 28091,
                        "arcs": [[-8628, 8630, 8631, 8632, -8498, -8488]]
                    }, {
                        "type": "Polygon",
                        "id": 13003,
                        "arcs": [[-8603, -8602, 8633, 8634, -8594, -8474]]
                    }, {
                        "type": "Polygon",
                        "id": 48455,
                        "arcs": [[8635, 8636, 8637, -8559, -8575]]
                    }, {
                        "type": "Polygon",
                        "id": 48371,
                        "arcs": [[-8533, 8638, 8639, 8640, 8641, -8399, -8540]]
                    }, {
                        "type": "Polygon",
                        "id": 13025,
                        "arcs": [[-8612, 8642, 8643, -8598, -8564, -8461]]
                    }, {
                        "type": "Polygon",
                        "id": 28157,
                        "arcs": [[-8552, 8644, 8645, 8646, -8493, -8504]]
                    }, {
                        "type": "Polygon",
                        "id": 22115,
                        "arcs": [[-8586, 8647, 8648, 8649, -8456, -8319]]
                    }, {
                        "type": "Polygon",
                        "id": 48395,
                        "arcs": [[8650, 8651, 8652, -8582, -8471, -8528]]
                    }, {
                        "type": "Polygon",
                        "id": 13075,
                        "arcs": [[8653, 8654, 8655, 8656, -8556, -8597]]
                    }, {
                        "type": "Polygon",
                        "id": 28005,
                        "arcs": [[-8510, 8657, 8658, 8659, 8660, -8645, -8551]]
                    }, {
                        "type": "Polygon",
                        "id": 28113,
                        "arcs": [[8661, 8662, 8663, -8658, -8509]]
                    }, {
                        "type": "Polygon",
                        "id": 28147,
                        "arcs": [[-8633, 8664, -8662, -8508, -8499]]
                    }, {
                        "type": "Polygon",
                        "id": 22009,
                        "arcs": [[-8411, -8497, 8665, 8666, 8667, 8668, -8583, -8428]]
                    }, {
                        "type": "Polygon",
                        "id": 13071,
                        "arcs": [[-8557, -8657, 8669, 8670, -8616, -8451]]
                    }, {
                        "type": "Polygon",
                        "id": 48027,
                        "arcs": [[-8581, 8671, 8672, 8673, -8604, -8515, -8443]]
                    }, {
                        "type": "Polygon",
                        "id": 1003,
                        "arcs": [[-8465, 8674, 8675, 8676, 8677, 8678, 8679, -8520, -8404]]
                    }, {
                        "type": "Polygon",
                        "id": 1069,
                        "arcs": [[-8579, 8680, 8681, 8682, -8546, -8485]]
                    }, {
                        "type": "Polygon",
                        "id": 1053,
                        "arcs": [[-8569, 8683, 8684, 8685, -8675, -8464, -8502]]
                    }, {
                        "type": "Polygon",
                        "id": 13201,
                        "arcs": [[-8615, 8686, 8687, -8577]]
                    }, {
                        "type": "Polygon",
                        "id": 1061,
                        "arcs": [[8688, 8689, 8690, -8566, -8549, -8547, -8683]]
                    }, {
                        "type": "Polygon",
                        "id": 48351,
                        "arcs": [[8691, 8692, 8693, 8694, -8553, -8457, -8650]]
                    }, {
                        "type": "Polygon",
                        "id": 13065,
                        "arcs": [[-8601, 8695, 8696, 8697, 8698, -8634]]
                    }, {
                        "type": "Polygon",
                        "id": 13173,
                        "arcs": [[-8699, 8699, 8700, -8595, -8635]]
                    }, {
                        "type": "Polygon",
                        "id": 1097,
                        "arcs": [[8701, 8702, 8703, -8620, -8521, -8680]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 13039,
                        "arcs": [[[8704]], [[8705, 8706, 8707, -8643, -8611]]]
                    }, {
                        "type": "Polygon",
                        "id": 48241,
                        "arcs": [[8708, 8709, 8710, -8572, -8536, -8554, -8695]]
                    }, {
                        "type": "Polygon",
                        "id": 48373,
                        "arcs": [[8711, 8712, 8713, 8714, -8636, -8574]]
                    }, {
                        "type": "Polygon",
                        "id": 48331,
                        "arcs": [[8715, 8716, 8717, -8672, -8580, -8653]]
                    }, {
                        "type": "Polygon",
                        "id": 48243,
                        "arcs": [[8718, -8392, -8390, -8400, -8642, 8719]]
                    }, {
                        "type": "Polygon",
                        "id": 48313,
                        "arcs": [[8720, 8721, 8722, -8527, -8561]]
                    }, {
                        "type": "Polygon",
                        "id": 48327,
                        "arcs": [[-8589, 8723, 8724, 8725, -8563]]
                    }, {
                        "type": "Polygon",
                        "id": 48413,
                        "arcs": [[-8726, 8726, 8727, -8570, -8517]]
                    }, {
                        "type": "Polygon",
                        "id": 48105,
                        "arcs": [[-8530, -8539, -8571, -8728, 8728, 8729, 8730, -8639, -8532]]
                    }, {
                        "type": "Polygon",
                        "id": 13087,
                        "arcs": [[-8614, -8619, 8731, 8732, 8733, -8687]]
                    }, {
                        "type": "Polygon",
                        "id": 13131,
                        "arcs": [[8734, 8735, 8736, -8732, -8618]]
                    }, {
                        "type": "Polygon",
                        "id": 13027,
                        "arcs": [[-8655, 8737, 8738, 8739, 8740, -8670, -8656]]
                    }, {
                        "type": "Polygon",
                        "id": 13275,
                        "arcs": [[-8671, -8741, 8741, 8742, -8735, -8617]]
                    }, {
                        "type": "Polygon",
                        "id": 13253,
                        "arcs": [[-8734, 8743, 8744, -8681, -8578, -8688]]
                    }, {
                        "type": "Polygon",
                        "id": 13049,
                        "arcs": [[8745, 8746, -8599, -8644, -8708]]
                    }, {
                        "type": "Polygon",
                        "id": 48457,
                        "arcs": [[-8711, 8747, -8712, -8573]]
                    }, {
                        "type": "Polygon",
                        "id": 48471,
                        "arcs": [[8748, 8749, 8750, -8721, -8560, -8638]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 22125,
                        "arcs": [[[8751, 8752, -8494, -8647, 8753]]]
                    }, {
                        "type": "Polygon",
                        "id": 48053,
                        "arcs": [[-8674, 8754, 8755, 8756, 8757, -8591, -8605]]
                    }, {
                        "type": "Polygon",
                        "id": 13185,
                        "arcs": [[-8596, -8701, 8758, 8759, 8760, 8761, -8738, -8654]]
                    }, {
                        "type": "Polygon",
                        "id": 22077,
                        "arcs": [[-8495, -8753, 8762, 8763, 8764, 8765, -8667, -8767]]
                    }, {
                        "type": "Polygon",
                        "id": 28109,
                        "arcs": [[-8625, 8767, 8768, 8769, 8770, -8631, -8627]]
                    }, {
                        "type": "Polygon",
                        "id": 22117,
                        "arcs": [[-8771, 8771, 8772, -8663, -8665, -8632]]
                    }, {
                        "type": "Polygon",
                        "id": 22039,
                        "arcs": [[-8669, 8773, 8774, 8775, 8776, -8584]]
                    }, {
                        "type": "Polygon",
                        "id": 12063,
                        "arcs": [[-8745, 8777, 8778, 8779, 8780, 8781, -8689, -8682]]
                    }, {
                        "type": "Polygon",
                        "id": 22105,
                        "arcs": [[-8773, 8782, 8783, 8784, 8785, 8786, -8659, -8664]]
                    }, {
                        "type": "Polygon",
                        "id": 12033,
                        "arcs": [[8787, -8676, -8686, 8788]]
                    }, {
                        "type": "Polygon",
                        "id": 12113,
                        "arcs": [[8789, 8790, -8789, -8685]]
                    }, {
                        "type": "Polygon",
                        "id": 28039,
                        "arcs": [[-8704, 8791, 8792, -8629, -8621]]
                    }, {
                        "type": "Polygon",
                        "id": 22091,
                        "arcs": [[-8787, 8793, 8794, 8795, -8660]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 12091,
                        "arcs": [[[-8568, 8796, 8797, -8790, -8684]]]
                    }, {
                        "type": "Polygon",
                        "id": 22037,
                        "arcs": [[-8796, 8798, 8799, -8754, -8646, -8661]]
                    }, {
                        "type": "Polygon",
                        "id": 12059,
                        "arcs": [[-8782, 8800, 8801, -8690]]
                    }, {
                        "type": "Polygon",
                        "id": 12131,
                        "arcs": [[-8691, -8802, 8802, 8803, 8804, -8806, 8806, -8797, -8567]]
                    }, {
                        "type": "Polygon",
                        "id": 48041,
                        "arcs": [[8807, 8808, 8809, -8651, -8723]]
                    }, {
                        "type": "Polygon",
                        "id": 48319,
                        "arcs": [[-8593, 8810, 8811, 8812, -8724, -8588]]
                    }, {
                        "type": "Polygon",
                        "id": 48299,
                        "arcs": [[-8758, 8813, 8814, -8811, -8592]]
                    }, {
                        "type": "Polygon",
                        "id": 28131,
                        "arcs": [[-8793, 8815, 8816, -8768, -8624, -8630]]
                    }, {
                        "type": "Polygon",
                        "id": 48491,
                        "arcs": [[8817, 8818, 8819, -8755, -8673, -8718]]
                    }, {
                        "type": "Polygon",
                        "id": 48407,
                        "arcs": [[-8715, 8820, 8821, -8749, -8637]]
                    }, {
                        "type": "Polygon",
                        "id": 22003,
                        "arcs": [[-8777, 8822, 8823, -8648, -8585]]
                    }, {
                        "type": "Polygon",
                        "id": 22011,
                        "arcs": [[-8824, 8824, 8825, -8692, -8649]]
                    }, {
                        "type": "Polygon",
                        "id": 13101,
                        "arcs": [[8826, 8827, -8759, -8700, -8698]]
                    }, {
                        "type": "Polygon",
                        "id": 48185,
                        "arcs": [[-8751, 8828, 8829, 8830, -8808, -8722]]
                    }, {
                        "type": "Polygon",
                        "id": 22097,
                        "arcs": [[-8766, 8831, 8832, 8833, -8774, -8668]]
                    }, {
                        "type": "Polygon",
                        "id": 12133,
                        "arcs": [[8834, -8803, -8801, -8781]]
                    }, {
                        "type": "Polygon",
                        "id": 12089,
                        "arcs": [[-8707, 8835, 8836, 8837, -8746]]
                    }, {
                        "type": "Polygon",
                        "id": 28059,
                        "arcs": [[-8703, 8838, 8839, -8816, -8792]]
                    }, {
                        "type": "Polygon",
                        "id": 48051,
                        "arcs": [[-8810, 8840, 8841, -8716, -8652]]
                    }, {
                        "type": "Polygon",
                        "id": 22033,
                        "arcs": [[8842, 8843, 8844, 8845, -8799, -8795]]
                    }, {
                        "type": "Polygon",
                        "id": 22103,
                        "arcs": [[-8770, 8846, 8847, 8848, 8849, -8783, -8772]]
                    }, {
                        "type": "Polygon",
                        "id": 12039,
                        "arcs": [[-8737, 8850, 8851, -8778, -8744, -8733]]
                    }, {
                        "type": "Polygon",
                        "id": 48267,
                        "arcs": [[8852, 8853, 8854, 8855, -8725, -8813]]
                    }, {
                        "type": "Polygon",
                        "id": 48435,
                        "arcs": [[-8856, 8856, 8857, -8729, -8727]]
                    }, {
                        "type": "Polygon",
                        "id": 12073,
                        "arcs": [[-8743, 8858, 8859, 8860, -8851, -8736]]
                    }, {
                        "type": "Polygon",
                        "id": 28047,
                        "arcs": [[-8840, 8861, 8862, -8817]]
                    }, {
                        "type": "Polygon",
                        "id": 12065,
                        "arcs": [[-8740, 8863, 8864, 8865, 8866, -8859, -8742]]
                    }, {
                        "type": "Polygon",
                        "id": 48043,
                        "arcs": [[8867, -8720, -8641, 8868, 8869]]
                    }, {
                        "type": "Polygon",
                        "id": 22121,
                        "arcs": [[8870, -8763, -8752, -8800, -8846]]
                    }, {
                        "type": "Polygon",
                        "id": 48443,
                        "arcs": [[8871, 8872, -8869, -8640, -8731]]
                    }, {
                        "type": "Polygon",
                        "id": 22063,
                        "arcs": [[-8786, 8873, 8874, -8843, -8794]]
                    }, {
                        "type": "Polygon",
                        "id": 12079,
                        "arcs": [[-8762, 8875, 8876, 8877, 8878, 8879, -8864, -8739]]
                    }, {
                        "type": "Polygon",
                        "id": 28045,
                        "arcs": [[-8863, 8880, -8847, -8769]]
                    }, {
                        "type": "Polygon",
                        "id": 12047,
                        "arcs": [[-8828, 8881, 8882, -8877, -8760]]
                    }, {
                        "type": "Polygon",
                        "id": 48377,
                        "arcs": [[-8868, 8883, -8719]]
                    }, {
                        "type": "Polygon",
                        "id": 48339,
                        "arcs": [[-8822, 8884, 8885, 8886, -8829, -8750]]
                    }, {
                        "type": "Polygon",
                        "id": 48453,
                        "arcs": [[8887, 8888, 8889, 8890, -8756, -8820]]
                    }, {
                        "type": "Polygon",
                        "id": 12013,
                        "arcs": [[8891, 8892, 8893, -8779]]
                    }, {
                        "type": "Polygon",
                        "id": 12077,
                        "arcs": [[-8861, 8894, 8895, 8896, -8892, -8852]]
                    }, {
                        "type": "Polygon",
                        "id": 12023,
                        "arcs": [[-8697, 8897, 8898, 8899, 8900, 8901, -8882, -8827]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 12031,
                        "arcs": [[[8902, 8903]], [[8904, 8905]], [[8906, 8907, 8908, -8837]]]
                    }, {
                        "type": "Polygon",
                        "id": 12003,
                        "arcs": [[-8838, -8909, 8909, 8910, 8911, -8898, -8696, -8600, -8747]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 12005,
                        "arcs": [[[8912, 8913]], [[-8894, 8914, 8915, -8804, -8835, -8780]]]
                    }, {
                        "type": "Polygon",
                        "id": 48287,
                        "arcs": [[8916, 8917, 8918, -8818, -8717, -8842]]
                    }, {
                        "type": "Polygon",
                        "id": 48199,
                        "arcs": [[-8710, 8919, 8920, 8921, -8713, -8748]]
                    }, {
                        "type": "Polygon",
                        "id": 48171,
                        "arcs": [[-8815, 8922, 8923, 8924, -8853, -8812]]
                    }, {
                        "type": "Polygon",
                        "id": 48031,
                        "arcs": [[-8757, -8891, 8925, 8926, 8927, -8923, -8814]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 22099,
                        "arcs": [[[8928, 8929, 8930]], [[8931, 8932, -8832, -8765, 8933]]]
                    }, {
                        "type": "Polygon",
                        "id": 22047,
                        "arcs": [[-8871, -8845, 8934, 8935, 8936, -8934, -8764]]
                    }, {
                        "type": "Polygon",
                        "id": 48291,
                        "arcs": [[-8922, 8937, 8938, 8939, -8885, -8821, -8714]]
                    }, {
                        "type": "Polygon",
                        "id": 22019,
                        "arcs": [[8940, 8941, 8942, -8693, -8826]]
                    }, {
                        "type": "Polygon",
                        "id": 22053,
                        "arcs": [[-8776, 8943, 8944, 8945, 8946, -8941, -8825, -8823]]
                    }, {
                        "type": "Polygon",
                        "id": 22001,
                        "arcs": [[-8834, 8947, 8948, 8949, -8945, -8944, -8775]]
                    }, {
                        "type": "Polygon",
                        "id": 12121,
                        "arcs": [[-8902, 8950, 8951, -8878, -8883]]
                    }, {
                        "type": "Polygon",
                        "id": 48021,
                        "arcs": [[8952, 8953, -8888, -8819, -8919]]
                    }, {
                        "type": "Polygon",
                        "id": 48477,
                        "arcs": [[-8831, 8954, 8955, 8956, -8917, -8841, -8809]]
                    }, {
                        "type": "Polygon",
                        "id": 22055,
                        "arcs": [[-8933, 8957, 8958, -8948, -8833]]
                    }, {
                        "type": "Polygon",
                        "id": 48209,
                        "arcs": [[8959, 8960, -8926, -8890, 8961]]
                    }, {
                        "type": "Polygon",
                        "id": 22005,
                        "arcs": [[-8875, 8962, 8963, 8964, 8965, -8935, -8844]]
                    }, {
                        "type": "Polygon",
                        "id": 12123,
                        "arcs": [[8966, 8967, 8968, -8865, -8880]]
                    }, {
                        "type": "Polygon",
                        "id": 12129,
                        "arcs": [[-8867, 8969, 8970, -8895, -8860]]
                    }, {
                        "type": "Polygon",
                        "id": 22095,
                        "arcs": [[8971, 8972, 8973, 8974, -8963, -8874, -8785]]
                    }, {
                        "type": "Polygon",
                        "id": 48465,
                        "arcs": [[-8858, 8975, 8976, 8977, -8872, -8730]]
                    }, {
                        "type": "Polygon",
                        "id": 48137,
                        "arcs": [[8978, 8979, 8980, 8981, -8976, -8857, -8855]]
                    }, {
                        "type": "Polygon",
                        "id": 48265,
                        "arcs": [[8982, 8983, 8984, -8979, -8854, -8925]]
                    }, {
                        "type": "Polygon",
                        "id": 12067,
                        "arcs": [[-8952, 8985, 8986, -8967, -8879]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 12109,
                        "arcs": [[[8987, 8988, 8989, 8990, 8991, -8903, 8992]], [[-8905, 8993]]]
                    }, {
                        "type": "Polygon",
                        "id": 48361,
                        "arcs": [[-8943, 8994, 8995, -8920, -8709, -8694]]
                    }, {
                        "type": "Polygon",
                        "id": 48473,
                        "arcs": [[8996, 8997, 8998, -8955, -8830, -8887]]
                    }, {
                        "type": "Polygon",
                        "id": 22089,
                        "arcs": [[8999, -8972, 9000]]
                    }, {
                        "type": "Polygon",
                        "id": 22051,
                        "arcs": [[9001, 9002, 9003, 9004, -9001, -8784, -8850]]
                    }, {
                        "type": "Polygon",
                        "id": 12045,
                        "arcs": [[-8897, 9005, 9006, 9007, 9008, -8913, 9009, -8915, -8893]]
                    }, {
                        "type": "Polygon",
                        "id": 22071,
                        "arcs": [[9010, 9011, 9012, -9002, -8849]]
                    }, {
                        "type": "Polygon",
                        "id": 12019,
                        "arcs": [[9013, 9014, 9015, -8910, -8908]]
                    }, {
                        "type": "Polygon",
                        "id": 48245,
                        "arcs": [[-8996, 9016, 9017, 9018, -8938, -8921]]
                    }, {
                        "type": "Polygon",
                        "id": 48201,
                        "arcs": [[-8940, 9019, 9020, 9021, 9022, 9023, -8997, -8886]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 22087,
                        "arcs": [[[9024, 9025, 9026, -9012, 9027]], [[9028]]]
                    }, {
                        "type": "Polygon",
                        "id": 22093,
                        "arcs": [[9029, 9030, -8965, -8964, -8975]]
                    }, {
                        "type": "Polygon",
                        "id": 48149,
                        "arcs": [[9031, 9032, 9033, 9034, 9035, -8953, -8918, -8957]]
                    }, {
                        "type": "Polygon",
                        "id": 22113,
                        "arcs": [[-8959, 9036, 9037, 9038, -8946, -8950, -8949]]
                    }, {
                        "type": "Polygon",
                        "id": 12007,
                        "arcs": [[-9016, 9039, 9040, 9041, -8911]]
                    }, {
                        "type": "Polygon",
                        "id": 12125,
                        "arcs": [[-9042, 9042, -8899, -8912]]
                    }, {
                        "type": "Polygon",
                        "id": 48259,
                        "arcs": [[-8928, 9043, 9044, 9045, -8983, -8924]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 22045,
                        "arcs": [[[9046]], [[-8937, 9047, -8930, 9048, 9049, -9037, -8958, -8932]]]
                    }, {
                        "type": "Polygon",
                        "id": 48015,
                        "arcs": [[-8999, 9050, 9051, 9052, -9032, -8956]]
                    }, {
                        "type": "Polygon",
                        "id": 22007,
                        "arcs": [[-8965, 8964, -9031, 9053, 9054, 9055, -8931, -9048, -8936, -8966]]
                    }, {
                        "type": "Polygon",
                        "id": 48385,
                        "arcs": [[-8985, 9056, 9057, -8980]]
                    }, {
                        "type": "Polygon",
                        "id": 48055,
                        "arcs": [[-8954, -9036, 9058, 9059, -8962, -8889]]
                    }, {
                        "type": "Polygon",
                        "id": 22023,
                        "arcs": [[-8947, -9039, 9060, -9017, -8995, -8942]]
                    }, {
                        "type": "Polygon",
                        "id": 48091,
                        "arcs": [[9061, 9062, -9044, -8927, -8961]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 12037,
                        "arcs": [[[9063]], [[-9008, 9064]], [[-8971, 9065, -9006, -8896]]]
                    }, {
                        "type": "Polygon",
                        "id": 48089,
                        "arcs": [[9066, 9067, 9068, -9033, -9053]]
                    }, {
                        "type": "Polygon",
                        "id": 22101,
                        "arcs": [[-9056, 9069, 9070, -9049, -8929]]
                    }, {
                        "type": "Polygon",
                        "id": 12001,
                        "arcs": [[-9041, 9071, 9072, 9073, 9074, -8900, -9043]]
                    }, {
                        "type": "Polygon",
                        "id": 12041,
                        "arcs": [[-9075, 9075, 9076, -8986, -8951, -8901]]
                    }, {
                        "type": "Polygon",
                        "id": 22057,
                        "arcs": [[9077, 9078, 9079, 9080, 9081, 9082, 9083, -9054, -9030, -8974, -8973, -9000, -9005, 9084]]
                    }, {
                        "type": "Polygon",
                        "id": 48019,
                        "arcs": [[9085, -9057, -8984, -9046, 9086, 9087]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 22075,
                        "arcs": [[[9088]], [[-9003, -9013, -9027, 9089]]]
                    }, {
                        "type": "Polygon",
                        "id": 48071,
                        "arcs": [[-9019, 9090, 9091, 9092, -9020, -8939]]
                    }, {
                        "type": "Polygon",
                        "id": 48187,
                        "arcs": [[9093, 9094, 9095, -9062, -8960, -9060]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 12107,
                        "arcs": [[[-8991, 9096, 9097, 9098]], [[9099, 9100, -9072, -9040, -9015]]]
                    }, {
                        "type": "Polygon",
                        "id": 48157,
                        "arcs": [[9101, 9102, 9103, -9051, -8998, -9024]]
                    }, {
                        "type": "Polygon",
                        "id": 48177,
                        "arcs": [[9104, 9105, 9106, 9107, -9094, -9059, -9035]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 22109,
                        "arcs": [[[9108]], [[-9070, -9055, -9084, 9109]]]
                    }, {
                        "type": "Polygon",
                        "id": 48029,
                        "arcs": [[-9096, 9110, 9111, 9112, -9087, -9045, -9063]]
                    }, {
                        "type": "Polygon",
                        "id": 48325,
                        "arcs": [[9113, 9114, 9115, -9088, -9113]]
                    }, {
                        "type": "Polygon",
                        "id": 12035,
                        "arcs": [[9116, 9117, -9097, -8990]]
                    }, {
                        "type": "Polygon",
                        "id": 48481,
                        "arcs": [[-9104, 9118, 9119, 9120, -9067, -9052]]
                    }, {
                        "type": "Polygon",
                        "id": 48285,
                        "arcs": [[9121, 9122, 9123, -9105, -9034, -9069]]
                    }, {
                        "type": "Polygon",
                        "id": 48463,
                        "arcs": [[-9116, 9124, 9125, -8981, -9058, -9086]]
                    }, {
                        "type": "Polygon",
                        "id": 48271,
                        "arcs": [[-9126, 9126, 9127, -8977, -8982]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 48167,
                        "arcs": [[[9128]], [[9129, -9022, 9130]], [[9131, -9092]]]
                    }, {
                        "type": "Polygon",
                        "id": 48039,
                        "arcs": [[-9130, 9132, 9133, -9119, -9103, -9102, -9023]]
                    }, {
                        "type": "Polygon",
                        "id": 12075,
                        "arcs": [[-9074, 9134, 9135, 9136, 9137, 9138, -9076]]
                    }, {
                        "type": "Polygon",
                        "id": 12083,
                        "arcs": [[9139, 9140, 9141, 9142, -9135, -9073, -9101]]
                    }, {
                        "type": "Polygon",
                        "id": 48493,
                        "arcs": [[-9108, 9143, 9144, -9111, -9095]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 12127,
                        "arcs": [[[9145, 9146, 9147, 9148, 9149, 9150, 9151, 9152, -9098, -9118, 9153]]]
                    }, {
                        "type": "Polygon",
                        "id": 48123,
                        "arcs": [[9154, 9155, -9106, -9124, 9156]]
                    }, {
                        "type": "Polygon",
                        "id": 12069,
                        "arcs": [[-9152, -9151, 9157, 9158, 9159, 9160, -9141, 9161]]
                    }, {
                        "type": "Polygon",
                        "id": 48239,
                        "arcs": [[9162, 9163, 9164, 9165, 9166, 9167, 9168, 9169, -9122, -9068, -9121]]
                    }, {
                        "type": "Polygon",
                        "id": 48013,
                        "arcs": [[9170, 9171, -9114, -9112, -9145, 9172, 9173]]
                    }, {
                        "type": "Polygon",
                        "id": 48321,
                        "arcs": [[9174, -9163, -9120, -9134, 9175]]
                    }, {
                        "type": "Polygon",
                        "id": 48255,
                        "arcs": [[9176, 9177, -9173, -9144, -9107, -9156, 9178]]
                    }, {
                        "type": "Polygon",
                        "id": 48469,
                        "arcs": [[-9170, 9179, 9180, 9181, 9182, -9157, -9123]]
                    }, {
                        "type": "Polygon",
                        "id": 48163,
                        "arcs": [[-9172, 9183, 9184, 9185, -9115]]
                    }, {
                        "type": "Polygon",
                        "id": 48507,
                        "arcs": [[-9186, 9186, 9187, -9125]]
                    }, {
                        "type": "Polygon",
                        "id": 48323,
                        "arcs": [[-9188, 9188, 9189, 9190, -9127]]
                    }, {
                        "type": "Polygon",
                        "id": 12017,
                        "arcs": [[-9136, -9143, 9191, 9192, 9193]]
                    }, {
                        "type": "Polygon",
                        "id": 12119,
                        "arcs": [[-9161, 9194, 9195, 9196, -9192, -9142]]
                    }, {
                        "type": "Polygon",
                        "id": 48175,
                        "arcs": [[-9183, 9197, 9198, -9179, -9155]]
                    }, {
                        "type": "Polygon",
                        "id": 12117,
                        "arcs": [[-9149, 9199, -9158, -9150]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 12009,
                        "arcs": [[[9200, 9201, 9202, 9203, -9148]], [[9204, 9205, 9206, -9146]]]
                    }, {
                        "type": "Polygon",
                        "id": 48297,
                        "arcs": [[9207, 9208, 9209, -9174, -9178, 9210, 9211]]
                    }, {
                        "type": "Polygon",
                        "id": 12095,
                        "arcs": [[-9200, -9204, 9212, -9159]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 48057,
                        "arcs": [[[9213, 9214]], [[9215, -9181, 9216]], [[-9166, 9217]]]
                    }, {
                        "type": "Polygon",
                        "id": 48025,
                        "arcs": [[-9199, 9218, 9219, -9211, -9177]]
                    }, {
                        "type": "Polygon",
                        "id": 12053,
                        "arcs": [[-9197, 9220, 9221, -9193]]
                    }, {
                        "type": "Polygon",
                        "id": 48283,
                        "arcs": [[9222, 9223, 9224, -9184]]
                    }, {
                        "type": "Polygon",
                        "id": 48311,
                        "arcs": [[-9210, 9225, -9223, -9171]]
                    }, {
                        "type": "Polygon",
                        "id": 48127,
                        "arcs": [[-9185, -9225, 9226, -9189, -9187]]
                    }, {
                        "type": "Polygon",
                        "id": 48391,
                        "arcs": [[-9216, 9227, 9228, 9229, 9230, 9231, -9219, -9198, -9182]]
                    }, {
                        "type": "Polygon",
                        "id": 12101,
                        "arcs": [[-9196, 9232, 9233, 9234, 9235, -9221]]
                    }, {
                        "type": "Polygon",
                        "id": 12105,
                        "arcs": [[9236, 9237, 9238, 9239, -9233, -9195, -9160]]
                    }, {
                        "type": "Polygon",
                        "id": 12097,
                        "arcs": [[-9203, 9240, 9241, -9237, -9213]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 48007,
                        "arcs": [[[9242]], [[9243, 9244, -9231]], [[9245, 9246]], [[-9229, 9247, 9248, 9249]]]
                    }, {
                        "type": "Polygon",
                        "id": 48479,
                        "arcs": [[9250, 9251, 9252, 9253, -9190, -9227, -9224]]
                    }, {
                        "type": "Polygon",
                        "id": 48409,
                        "arcs": [[-9245, 9254, -9246, 9255, 9256, 9257, 9258, 9259, 9260, -9212, -9220, -9232]]
                    }, {
                        "type": "Polygon",
                        "id": 12103,
                        "arcs": [[9261, 9262, -9235]]
                    }, {
                        "type": "Polygon",
                        "id": 12057,
                        "arcs": [[-9240, 9263, 9264, -9262, -9234]]
                    }, {
                        "type": "Polygon",
                        "id": 48131,
                        "arcs": [[9265, 9266, 9267, -9251, -9226, -9209]]
                    }, {
                        "type": "Polygon",
                        "id": 48249,
                        "arcs": [[-9261, -9260, 9268, 9269, 9270, -9266, -9208]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 48355,
                        "arcs": [[[9271]], [[9272, -9269, -9259, 9273]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 12061,
                        "arcs": [[[9274, 9275, -9241, -9202, 9276]]]
                    }, {
                        "type": "Polygon",
                        "id": 12055,
                        "arcs": [[9277, 9278, 9279, 9280, -9238]]
                    }, {
                        "type": "Polygon",
                        "id": 12049,
                        "arcs": [[-9281, 9281, 9282, -9239]]
                    }, {
                        "type": "Polygon",
                        "id": 12081,
                        "arcs": [[-9283, 9283, 9284, 9285, -9264]]
                    }, {
                        "type": "Polygon",
                        "id": 12093,
                        "arcs": [[-9276, 9286, 9287, 9288, -9278, -9242]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 48273,
                        "arcs": [[[9289, 9290, 9291, 9292]], [[9293, 9294, 9295, -9270, -9273]]]
                    }, {
                        "type": "Polygon",
                        "id": 12111,
                        "arcs": [[9296, 9297, 9298, 9299, -9287, -9275]]
                    }, {
                        "type": "Polygon",
                        "id": 12115,
                        "arcs": [[-9285, 9300, 9301, 9302, 9303, 9304]]
                    }, {
                        "type": "Polygon",
                        "id": 48247,
                        "arcs": [[9305, 9306, 9307, -9252, -9268]]
                    }, {
                        "type": "Polygon",
                        "id": 12027,
                        "arcs": [[-9280, 9308, -9301, -9284, -9282]]
                    }, {
                        "type": "Polygon",
                        "id": 48505,
                        "arcs": [[-9308, 9309, 9310, -9253]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 48261,
                        "arcs": [[[9311, 9312]], [[9313, -9290, 9314]], [[9315, 9316, 9317, -9295, 9318]]]
                    }, {
                        "type": "Polygon",
                        "id": 48047,
                        "arcs": [[-9271, -9296, -9318, 9319, 9320, -9306, -9267]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 12085,
                        "arcs": [[[9321, 9322, 9323, 9324, 9325, -9288, -9300, 9326]]]
                    }, {
                        "type": "Polygon",
                        "id": 12043,
                        "arcs": [[9327, 9328, -9279, -9289]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 12015,
                        "arcs": [[[-9304, 9329]], [[-9329, 9330, 9331, -9302, -9309]]]
                    }, {
                        "type": "Polygon",
                        "id": 12099,
                        "arcs": [[9332, 9333, 9334, -9326]]
                    }, {
                        "type": "Polygon",
                        "id": 12051,
                        "arcs": [[9335, 9336, 9337, -9328, -9335]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 12071,
                        "arcs": [[[9338]], [[-9338, 9339, 9340, -9331]]]
                    }, {
                        "type": "Polygon",
                        "id": 48427,
                        "arcs": [[-9321, 9341, 9342, -9310, -9307]]
                    }, {
                        "type": "Polygon",
                        "id": 48215,
                        "arcs": [[-9317, 9343, 9344, 9345, -9342, -9320]]
                    }, {
                        "type": "Polygon",
                        "id": 48489,
                        "arcs": [[9346, -9344, -9316, 9347]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 12021,
                        "arcs": [[[9348, 9349, 9350, 9351, -9340, -9337]]]
                    }, {
                        "type": "Polygon",
                        "id": 48061,
                        "arcs": [[-9345, -9347, 9352]]
                    }, {
                        "type": "Polygon",
                        "id": 12011,
                        "arcs": [[9353, 9354, -9349, -9336, -9334]]
                    }, {
                        "type": "Polygon",
                        "id": 12086,
                        "arcs": [[9355, 9356, 9357, 9358, 9359, -9350, -9355, 9360]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 12087,
                        "arcs": [[[9361]], [[-9360, 9362, -9351]]]
                    }, {
                        "type": "Polygon",
                        "id": 4015,
                        "arcs": [[-5737, -6670, -7308, -6521, -5912, -4625, -5343, -5417]]
                    }, {
                        "type": "Polygon",
                        "id": 12029,
                        "arcs": [[-9077, -9139, 9363, -8968, -8987]]
                    }, {
                        "type": "Polygon",
                        "id": 27077,
                        "arcs": [[-125, -180, -108, 9364]]
                    }, {
                        "type": "Polygon",
                        "id": 27031,
                        "arcs": [[9365, -203, 9366]]
                    }, {
                        "type": "Polygon",
                        "id": 55031,
                        "arcs": [[9367, -675, -668, -593, -474, -148, 9368]]
                    }, {
                        "type": "Polygon",
                        "id": 55007,
                        "arcs": [[9369, -673, -9368, 9370]]
                    }, {
                        "type": "Polygon",
                        "id": 55003,
                        "arcs": [[-561, -721, -669, -9370, 9371]]
                    }, {
                        "type": "Polygon",
                        "id": 55003,
                        "arcs": [[9372]]
                    }, {
                        "type": "Polygon",
                        "id": 26083,
                        "arcs": [[9373, 9374, 9375]]
                    }, {
                        "type": "Polygon",
                        "id": 26083,
                        "arcs": [[9376]]
                    }, {
                        "type": "Polygon",
                        "id": 26061,
                        "arcs": [[9377, -446, -592, -436, 9378]]
                    }, {
                        "type": "Polygon",
                        "id": 26061,
                        "arcs": [[9379, -9375]]
                    }, {
                        "type": "Polygon",
                        "id": 26103,
                        "arcs": [[9380, 9381, -716, -642, -586, -444, 9382]]
                    }, {
                        "type": "Polygon",
                        "id": 26003,
                        "arcs": [[-577, 9383, -9381, 9384, -491]]
                    }, {
                        "type": "Polygon",
                        "id": 26041,
                        "arcs": [[-9384, -576, 9385, -712, -9382]]
                    }, {
                        "type": "Polygon",
                        "id": 55075,
                        "arcs": [[-715, 9386, -879, -687, -704, -640]]
                    }, {
                        "type": "Polygon",
                        "id": 55029,
                        "arcs": [[-1169, 9387]]
                    }, {
                        "type": "Polygon",
                        "id": 26033,
                        "arcs": [[9388, 9389]]
                    }, {
                        "type": "Polygon",
                        "id": 26033,
                        "arcs": [[9390]]
                    }, {
                        "type": "Polygon",
                        "id": 26033,
                        "arcs": [[9391, 9392, 9393, -488, 9394]]
                    }, {
                        "type": "Polygon",
                        "id": 26097,
                        "arcs": [[9395]]
                    }, {
                        "type": "Polygon",
                        "id": 26097,
                        "arcs": [[9396, 9397, -574, -489, -9394]]
                    }, {
                        "type": "Polygon",
                        "id": 26047,
                        "arcs": [[-771, 9398, 9399]]
                    }, {
                        "type": "Polygon",
                        "id": 26029,
                        "arcs": [[-9399, -770, -953, -950, 9400]]
                    }, {
                        "type": "Polygon",
                        "id": 26029,
                        "arcs": [[9401]]
                    }, {
                        "type": "Polygon",
                        "id": 26089,
                        "arcs": [[9402]]
                    }, {
                        "type": "Polygon",
                        "id": 26089,
                        "arcs": [[9403, -1114, 9404]]
                    }, {
                        "type": "Polygon",
                        "id": 26055,
                        "arcs": [[-948, -1082, -1230, -1111, -9404, 9405]]
                    }, {
                        "type": "Polygon",
                        "id": 26007,
                        "arcs": [[9406, -1079, -954, -819]]
                    }, {
                        "type": "Polygon",
                        "id": 26011,
                        "arcs": [[9407, -1439, -1400, -1240, -1238]]
                    }, {
                        "type": "Polygon",
                        "id": 26063,
                        "arcs": [[-1578, -1556, 9408]]
                    }, {
                        "type": "Polygon",
                        "id": 26147,
                        "arcs": [[-1931, -1726, -1576, 9409]]
                    }, {
                        "type": "Polygon",
                        "id": 26163,
                        "arcs": [[9410, 9411, -2133, -1932, -1929]]
                    }, {
                        "type": "Polygon",
                        "id": 26115,
                        "arcs": [[9412, -2505, -2280, -2130, -9412]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 45019,
                        "arcs": [[[9413, 9414, 9415, -7862, -7809, -7695]], [[-7693, -7590, 9416]]]
                    }, {
                        "type": "Polygon",
                        "id": 15001,
                        "arcs": [[9417]]
                    }, {
                        "type": "Polygon",
                        "id": 15007,
                        "arcs": [[9418]]
                    }, {
                        "type": "Polygon",
                        "id": 15009,
                        "arcs": [[-9420, 9420]]
                    }, {
                        "type": "Polygon",
                        "id": 15009,
                        "arcs": [[9421]]
                    }, {
                        "type": "Polygon",
                        "id": 15009,
                        "arcs": [[9422]]
                    }, {
                        "type": "Polygon",
                        "id": 15009,
                        "arcs": [[9423]]
                    }, {
                        "type": "Polygon",
                        "id": 15003,
                        "arcs": [[9424]]
                    }, {
                        "type": "Polygon",
                        "id": 15007,
                        "arcs": [[9425]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 2016,
                        "arcs": [[[9426]], [[9427]], [[9428]], [[9429]], [[9430]], [[9431]], [[9432]], [[9433]], [[9434]], [[9435]], [[9436]], [[9437]], [[9438]], [[9439]], [[9440]], [[9441]], [[9442]], [[9443]], [[9444]], [[9445]], [[9446]], [[9447]], [[9448]], [[9449]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 2013,
                        "arcs": [[[9450]], [[9451]], [[9452]], [[9453]], [[9454]], [[9455]], [[9456]], [[9457]], [[9458]], [[9459]], [[9460]], [[9461]], [[9462, 9463, 9464, 9465]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 2130,
                        "arcs": [[[9466]], [[9467]]]
                    }, {
                        "type": "Polygon",
                        "id": 2060,
                        "arcs": [[9468, 9469]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 2070,
                        "arcs": [[[9470]], [[9471, 9472]], [[9473, 9474, 9475]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 2164,
                        "arcs": [[[9476]], [[9477, 9478, 9479, -9465, 9480, -9470, 9481, -9475, 9482]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 2150,
                        "arcs": [[[9483]], [[9484]], [[9485]], [[9486]], [[9487]], [[9488]], [[9489]], [[9490]], [[9491]], [[9492]], [[9493, -9479, 9494, 9495]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 2110,
                        "arcs": [[[9496, 9497, 9498, 9499]], [[9500]], [[9501, 9502, 9503, 9504, 9505, 9506]], [[9507, 9508]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 2280,
                        "arcs": [[[9509]], [[9510]], [[9511]], [[9512]], [[9513]], [[9514]], [[9515]], [[9516, 9517, 9518, 9519]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 2232,
                        "arcs": [[[9520, 9521, 9522, 9523]], [[9524]], [[-9520, 9525, 9526, 9527, -9503, 9528]], [[-9497, 9529, 9530, 9531]], [[9532, 9533]], [[-9499, 9534]], [[9535, 9536, 9537, 9538]], [[9539, 9540, 9541, 9542]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 2100,
                        "arcs": [[[-9507, 9543, -9508, 9544, -9540, 9545]], [[9546, -9538, 9547, -9542]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 2220,
                        "arcs": [[[9548]], [[9549, 9550]], [[-9521, 9551, -9533, 9552]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 2270,
                        "arcs": [[[9553]], [[9554]], [[9555]], [[9556, 9557, 9558, 9559]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 2050,
                        "arcs": [[[9560]], [[9561]], [[9562]], [[9563]], [[-9559, 9564, 9565, 9566, -9483, -9474, 9567, -9473, 9568]]]
                    }, {
                        "type": "Polygon",
                        "id": 2170,
                        "arcs": [[9569, 9570, 9571, 9572, -9566, 9573, 9574, 9575]]
                    }, {
                        "type": "Polygon",
                        "id": 2068,
                        "arcs": [[9576, 9577, -9575, 9578]]
                    }, {
                        "type": "Polygon",
                        "id": 2020,
                        "arcs": [[-9571, 9579, 9580, 9581]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 2261,
                        "arcs": [[[9582]], [[9583]], [[9584]], [[9585]], [[9586]], [[9587]], [[9588]], [[9589]], [[9590, 9591]], [[9592]], [[9593]], [[9594]], [[9595, 9596]], [[9597]], [[9598, -9580, -9570, 9599, 9600, 9601, 9602]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 2122,
                        "arcs": [[[9603]], [[9604]], [[9605]], [[-9581, -9599, 9606, -9596, 9607, -9591, 9608]], [[-9495, -9478, -9567, -9573, 9609]]]
                    }, {
                        "type": "Polygon",
                        "id": 2282,
                        "arcs": [[-9602, 9610, -9536, 9611]]
                    }, {
                        "type": "Polygon",
                        "id": 2290,
                        "arcs": [[9612, 9613, 9614, -9579, -9574, -9565, -9558, 9615, 9616, 9617]]
                    }, {
                        "type": "Polygon",
                        "id": 2090,
                        "arcs": [[9618, -9577, -9615]]
                    }, {
                        "type": "Polygon",
                        "id": 2240,
                        "arcs": [[-9600, -9576, -9578, -9619, -9614, 9619]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 2185,
                        "arcs": [[[9620]], [[-9618, 9621, 9622]]]
                    }, {
                        "type": "Polygon",
                        "id": 2188,
                        "arcs": [[-9617, 9623, 9624, -9622]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 2180,
                        "arcs": [[[9625]], [[9626]], [[9627]], [[-9624, -9616, -9557, 9628]]]
                    }, {
                        "type": "Polygon",
                        "id": 2201,
                        "arcs": [[9629]]
                    }, {
                        "type": "Polygon",
                        "id": 2201,
                        "arcs": [[9630]]
                    }, {
                        "type": "Polygon",
                        "id": 2201,
                        "arcs": [[9631]]
                    }, {
                        "type": "Polygon",
                        "id": 2201,
                        "arcs": [[9632]]
                    }, {
                        "type": "Polygon",
                        "id": 2201,
                        "arcs": [[9633]]
                    }, {
                        "type": "Polygon",
                        "id": 2201,
                        "arcs": [[9634]]
                    }, {
                        "type": "Polygon",
                        "id": 2201,
                        "arcs": [[9635]]
                    }, {
                        "type": "Polygon",
                        "id": 2201,
                        "arcs": [[9636]]
                    }, {
                        "type": "Polygon",
                        "id": 2201,
                        "arcs": [[9637]]
                    }, {
                        "type": "Polygon",
                        "id": 2201,
                        "arcs": [[9638]]
                    }, {
                        "type": "Polygon",
                        "id": 2201,
                        "arcs": [[9639]]
                    }, {
                        "type": "Polygon",
                        "id": 2201,
                        "arcs": [[9640]]
                    }, {
                        "type": "Polygon",
                        "id": 2201,
                        "arcs": [[9641]]
                    }, {
                        "type": "Polygon",
                        "id": 2201,
                        "arcs": [[9642]]
                    }, {
                        "type": "Polygon",
                        "id": 2201,
                        "arcs": [[9643]]
                    }, {
                        "type": "Polygon",
                        "id": 2201,
                        "arcs": [[-9518, 9644]]
                    }, {
                        "type": "Polygon",
                        "id": 72125,
                        "arcs": [[9645, 9646, 9647, 9648, 9649, 9650]]
                    }, {
                        "type": "Polygon",
                        "id": 72003,
                        "arcs": [[9651, 9652, 9653, 9654, 9655]]
                    }, {
                        "type": "Polygon",
                        "id": 72097,
                        "arcs": [[9656, 9657, -9651, 9658, 9659, 9660, 9661]]
                    }, {
                        "type": "Polygon",
                        "id": 72065,
                        "arcs": [[9662, 9663, 9664, 9665, 9666]]
                    }, {
                        "type": "Polygon",
                        "id": 72055,
                        "arcs": [[9667, 9668, 9669, 9670]]
                    }, {
                        "type": "Polygon",
                        "id": 72083,
                        "arcs": [[9671, 9672, -9657, 9673, 9674]]
                    }, {
                        "type": "Polygon",
                        "id": 72025,
                        "arcs": [[9675, 9676, 9677, 9678, 9679, 9680, 9681]]
                    }, {
                        "type": "Polygon",
                        "id": 72045,
                        "arcs": [[9682, 9683, 9684, 9685, 9686]]
                    }, {
                        "type": "Polygon",
                        "id": 72133,
                        "arcs": [[9687, 9688, 9689, 9690]]
                    }, {
                        "type": "Polygon",
                        "id": 72121,
                        "arcs": [[-9671, 9691, -9647, 9692, 9693]]
                    }, {
                        "type": "Polygon",
                        "id": 72027,
                        "arcs": [[-9666, 9694, 9695, 9696, 9697]]
                    }, {
                        "type": "Polygon",
                        "id": 72001,
                        "arcs": [[9698, 9699, 9700, 9701, 9702, 9703]]
                    }, {
                        "type": "Polygon",
                        "id": 72111,
                        "arcs": [[9704, 9705, 9706, -9700]]
                    }, {
                        "type": "Polygon",
                        "id": 72047,
                        "arcs": [[9707, 9708, 9709, 9710, 9711, 9712]]
                    }, {
                        "type": "Polygon",
                        "id": 72091,
                        "arcs": [[9713, 9714, 9715, 9716, 9717, 9718]]
                    }, {
                        "type": "Polygon",
                        "id": 72013,
                        "arcs": [[9719, 9720, 9721, 9722, -9663, 9723]]
                    }, {
                        "type": "Polygon",
                        "id": 72145,
                        "arcs": [[9724, 9725, -9714, 9726]]
                    }, {
                        "type": "Polygon",
                        "id": 72031,
                        "arcs": [[9727, 9728, 9729, 9730, 9731, 9732]]
                    }, {
                        "type": "Polygon",
                        "id": 72061,
                        "arcs": [[9733, 9734, 9735, 9736, 9737]]
                    }, {
                        "type": "Polygon",
                        "id": 72129,
                        "arcs": [[9738, 9739, 9740, 9741, 9742, -9678, 9743]]
                    }, {
                        "type": "Polygon",
                        "id": 72075,
                        "arcs": [[9744, 9745, -9691, 9746, 9747, 9748, 9749]]
                    }, {
                        "type": "Polygon",
                        "id": 72063,
                        "arcs": [[-9729, 9750, -9744, -9677, 9751]]
                    }, {
                        "type": "Polygon",
                        "id": 72073,
                        "arcs": [[9752, -9749, 9753, 9754, 9755]]
                    }, {
                        "type": "Polygon",
                        "id": 72143,
                        "arcs": [[9756, 9757, -9712, 9758, -9725, 9759]]
                    }, {
                        "type": "Polygon",
                        "id": 72011,
                        "arcs": [[9760, -9674, -9662, 9761, 9762, -9653, 9763]]
                    }, {
                        "type": "Polygon",
                        "id": 72081,
                        "arcs": [[-9665, 9764, -9703, 9765, 9766, -9672, 9767, -9695]]
                    }, {
                        "type": "Polygon",
                        "id": 72079,
                        "arcs": [[-9692, -9670, 9768, 9769, -9648]]
                    }, {
                        "type": "Polygon",
                        "id": 72009,
                        "arcs": [[9770, 9771, 9772, 9773, 9774]]
                    }, {
                        "type": "Polygon",
                        "id": 72099,
                        "arcs": [[9775, 9776, -9764, -9652, 9777]]
                    }, {
                        "type": "Polygon",
                        "id": 72023,
                        "arcs": [[9778, -9649, -9770, 9779, -9660]]
                    }, {
                        "type": "Polygon",
                        "id": 72109,
                        "arcs": [[9780, 9781, 9782, -9784, 9784, 9785, -9742]]
                    }, {
                        "type": "Polygon",
                        "id": 72101,
                        "arcs": [[-9759, -9711, 9786, 9787, -9715, -9726]]
                    }, {
                        "type": "Polygon",
                        "id": 72005,
                        "arcs": [[-9778, -9656, 9788, 9789]]
                    }, {
                        "type": "Polygon",
                        "id": 72059,
                        "arcs": [[-9707, 9790, 9791, -9701]]
                    }, {
                        "type": "Polygon",
                        "id": 72021,
                        "arcs": [[-9736, 9792, -9683, 9793, 9794, 9795, 9796]]
                    }, {
                        "type": "Polygon",
                        "id": 72141,
                        "arcs": [[9797, -9755, 9798, -9704, -9765, -9664, -9723]]
                    }, {
                        "type": "Polygon",
                        "id": 72041,
                        "arcs": [[-9680, 9799, -9775, 9800, -9685, 9801]]
                    }, {
                        "type": "Polygon",
                        "id": 72123,
                        "arcs": [[9802, 9803, -9689, 9804, -9772, 9805]]
                    }, {
                        "type": "Polygon",
                        "id": 72131,
                        "arcs": [[9806, -9696, -9768, -9675, -9761, -9777, 9807]]
                    }, {
                        "type": "Polygon",
                        "id": 72035,
                        "arcs": [[-9743, -9786, 9808, -9806, -9771, -9800, -9679]]
                    }, {
                        "type": "Polygon",
                        "id": 72135,
                        "arcs": [[-9795, 9809, -9713, -9758, 9810, 9811]]
                    }, {
                        "type": "Polygon",
                        "id": 72115,
                        "arcs": [[-9697, -9807, 9812, 9813]]
                    }, {
                        "type": "Polygon",
                        "id": 72054,
                        "arcs": [[-9717, 9814, -9721, 9815]]
                    }, {
                        "type": "Polygon",
                        "id": 72105,
                        "arcs": [[-9794, -9687, 9816, -9708, -9810]]
                    }, {
                        "type": "Polygon",
                        "id": 72017,
                        "arcs": [[-9718, -9816, -9720, 9817]]
                    }, {
                        "type": "Polygon",
                        "id": 72127,
                        "arcs": [[-9731, 9818, -9682, 9819, -9734, 9820]]
                    }, {
                        "type": "Polygon",
                        "id": 72139,
                        "arcs": [[-9730, -9752, -9676, -9819]]
                    }, {
                        "type": "Polygon",
                        "id": 72057,
                        "arcs": [[-9785, -9822, 9822, -9803, -9809]]
                    }, {
                        "type": "Polygon",
                        "id": 72153,
                        "arcs": [[-9702, -9792, 9823, -9668, -9694, 9824, -9766]]
                    }, {
                        "type": "Polygon",
                        "id": 72043,
                        "arcs": [[9825, 9826, -9773, -9805, -9688, -9746, 9827]]
                    }, {
                        "type": "Polygon",
                        "id": 72149,
                        "arcs": [[-9828, -9745, 9828]]
                    }, {
                        "type": "Polygon",
                        "id": 72039,
                        "arcs": [[-9788, 9829, -9756, -9798, -9722, -9815, -9716]]
                    }, {
                        "type": "Polygon",
                        "id": 72113,
                        "arcs": [[-9748, 9830, -9705, -9699, -9799, -9754]]
                    }, {
                        "type": "Polygon",
                        "id": 72107,
                        "arcs": [[9831, -9826, -9829, -9750, -9753, -9830, -9787, -9710]]
                    }, {
                        "type": "Polygon",
                        "id": 72071,
                        "arcs": [[-9813, -9808, -9776, -9790, 9832]]
                    }, {
                        "type": "Polygon",
                        "id": 72007,
                        "arcs": [[-9681, -9802, -9684, -9793, -9735, -9820]]
                    }, {
                        "type": "Polygon",
                        "id": 72019,
                        "arcs": [[-9686, -9801, -9774, -9827, -9832, -9709, -9817]]
                    }, {
                        "type": "Polygon",
                        "id": 72093,
                        "arcs": [[-9767, -9825, -9693, -9646, -9658, -9673]]
                    }, {
                        "type": "Polygon",
                        "id": 72151,
                        "arcs": [[9833, 9834, 9835, -9781, -9741, 9836]]
                    }, {
                        "type": "Polygon",
                        "id": 72137,
                        "arcs": [[9837, -9796, -9812, 9838, 9839]]
                    }, {
                        "type": "Polygon",
                        "id": 78030,
                        "arcs": [[9840]]
                    }, {
                        "type": "Polygon",
                        "id": 72089,
                        "arcs": [[9841, 9842, 9843, 9844]]
                    }, {
                        "type": "Polygon",
                        "id": 72087,
                        "arcs": [[9845, 9846, -9733, 9847]]
                    }, {
                        "type": "Polygon",
                        "id": 72095,
                        "arcs": [[9848, -9782, -9836]]
                    }, {
                        "type": "Polygon",
                        "id": 72119,
                        "arcs": [[-9844, 9849, 9850, 9851, 9852, -9846, 9853]]
                    }, {
                        "type": "Polygon",
                        "id": 72103,
                        "arcs": [[9854, 9855, 9856, 9857, -9851]]
                    }, {
                        "type": "Polygon",
                        "id": 72085,
                        "arcs": [[-9858, 9858, -9837, -9740, 9859, 9860, -9852]]
                    }, {
                        "type": "Polygon",
                        "id": 72029,
                        "arcs": [[-9853, -9861, 9861, -9728, -9847]]
                    }, {
                        "type": "Polygon",
                        "id": 72053,
                        "arcs": [[9862, -9842, 9863]]
                    }, {
                        "type": "Polygon",
                        "id": 72077,
                        "arcs": [[-9860, -9739, -9751, -9862]]
                    }, {
                        "type": "Polygon",
                        "id": 72037,
                        "arcs": [[9864, -9855, -9850, -9843, -9863]]
                    }, {
                        "type": "Polygon",
                        "id": 72069,
                        "arcs": [[9865, -9834, -9859, -9857]]
                    }, {
                        "type": "Polygon",
                        "id": 72147,
                        "arcs": [[9866]]
                    }, {
                        "type": "Polygon",
                        "id": 78010,
                        "arcs": [[9867]]
                    }, {
                        "type": "Polygon",
                        "id": 72051,
                        "arcs": [[-9839, -9811, -9757, 9868]]
                    }]
                },
                states: {
                    "type": "GeometryCollection",
                    "geometries": [{
                        "type": "MultiPolygon",
                        "id": 2,
                        "arcs": [[[9426]], [[9427]], [[9428]], [[9429]], [[9430]], [[9431]], [[9432]], [[9433]], [[9434]], [[9435]], [[9436]], [[9437]], [[9438]], [[9439]], [[9440]], [[9441]], [[9442]], [[9443]], [[9444]], [[9445]], [[9446]], [[9447]], [[9450]], [[9451]], [[9452]], [[9453]], [[9629]], [[9454]], [[9630]], [[9455]], [[9456]], [[9631]], [[9457]], [[9632]], [[9633]], [[9458]], [[9634]], [[9459]], [[9460]], [[9466]], [[9635]], [[9461]], [[9636]], [[9637]], [[9638]], [[9639]], [[9483]], [[9640]], [[9509]], [[9467]], [[9641]], [[9642]], [[9510]], [[9643]], [[9511]], [[9512]], [[9484]], [[9476]], [[9485]], [[9486]], [[9448]], [[9513]], [[9514]], [[9515]], [[9487]], [[9449]], [[9548]], [[9869, 9550]], [[9488]], [[9489]], [[9524]], [[9490]], [[9552, 9521, 9870, 9523, 9551, 9533]], [[9500]], [[9499, 9529, 9871, 9531, 9497, 9534]], [[9491]], [[9492]], [[9470]], [[9603]], [[9604]], [[9582]], [[9583]], [[9584]], [[9585]], [[9560]], [[9586]], [[9587]], [[9561]], [[9588]], [[9605]], [[9589]], [[9562]], [[9592]], [[9593]], [[9594]], [[9563]], [[9597]], [[9553]], [[9554]], [[9555]], [[9625]], [[9626]], [[9627]], [[9620]], [[9611, 9602, 9606, 9596, 9607, 9591, 9608, 9581, 9571, 9609, 9872, 9493, 9479, 9465, 9873, 9463, 9480, 9468, 9481, 9475, 9567, 9471, 9568, 9559, 9628, 9624, 9622, 9612, 9619, 9600, 9610, 9536, 9547, 9542, 9545, 9501, 9528, 9516, 9644, 9518, 9525, 9874, 9527, 9503, 9875, 9505, 9543, 9508, 9544, 9540, 9546, 9538]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 15,
                        "arcs": [[[9417]], [[9422]], [[9421]], [[9423]], [[9876, 9420]], [[9424]], [[9425]], [[9418]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 72,
                        "arcs": [[[9866]], [[9813, 9697, 9666, 9723, 9817, 9718, 9726, 9759, 9868, 9839, 9877, 9737, 9820, 9731, 9847, 9853, 9844, 9863, 9864, 9855, 9865, 9834, 9848, 9782, 9878, 9822, 9803, 9689, 9746, 9830, 9705, 9790, 9823, 9668, 9768, 9779, 9660, 9761, 9879, 9654, 9788, 9832]]]
                    }, {
                        "type": "Polygon",
                        "id": 1,
                        "arcs": [[-6786, -6785, -6792, -6791, -6807, 6974, -6994, -6998, 7027, -7168, -7171, 7205, -7420, 7492, 7493, -7574, 7698, 7699, -7846, 7871, -8018, 8061, -8111, -8157, 8194, -8293, 8320, 8321, -8483, 8483, -8579, 8680, 8681, 8688, 8689, 8690, 8566, 8567, 8683, 8684, 8685, 8675, 8676, 9880, 8678, 8701, 8702, 8703, -8620, 8521, -8436, 8249, 8250, -8128, 7954, 7955, -7826, 7678, -7599, 7448, -7421, 7302, -7257, 7179, -6951, -6954, 6937, -6753, -6699, -6714, -6725, -6724]]
                    }, {
                        "type": "Polygon",
                        "id": 5,
                        "arcs": [[-5843, -5842, -5816, -5921, -5920, -5919, -5932, -5931, -5930, -5716, -5888, -5887, -5886, -5917, -5916, -5866, -5973, -5972, -5971, -5970, -5969, -6163, -6274, 6406, 6407, 6408, 6409, -6605, 6734, 6735, 6736, 7015, -7027, 7132, 7133, -7415, -7414, 7662, 7663, 7664, 7665, 7666, 7777, 7794, 7795, 7733, 7734, 7719, 7720, 7643, 7644, 7645, -7611, 7513, -7233, -7232, 7118, -6775, -6774, 6727, -6611, 6550, -6316, 6256, 6117, -5946, -5936]]
                    }, {
                        "type": "Polygon",
                        "id": 4,
                        "arcs": [[-4752, -5779, 5779, 5780, 5781, -7177, 7591, 7592, -8039, 8208, 8504, 8191, 7725, 7726, 7305, 7306, -6522, -6521, -5912, -4625, -5343, -5417, -5416, -4754, -4753]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 6,
                        "arcs": [[[7053]], [[7019]], [[7054]], [[6896]], [[6897]], [[-1601, -1600, -1604, 2383, -2395, -2394, -2393, -2392, 4129, 4130, -4310, -4309, -4308, -3802, -4324, 4568, -4773, -4255, 5466, -5913, 6520, 6521, -7307, -7306, -7727, 7740, 7697, 7519, 7056, 7020, 6899, 6528, 5874, 5606, 5291, 5193, 5288, 5438, 5155, 5018, 4853, 4552, 4697, 4472, 4696, 4474, 4482, 4847, 4484, 3626, 2685, 2373, -1893, -1975, -1974, -1882]]]
                    }, {
                        "type": "Polygon",
                        "id": 8,
                        "arcs": [[-2141, -2140, -2553, -2552, -2733, -2732, -2702, -2701, -2823, -2972, -2971, 3139, -3194, 3363, 3364, -3620, 3939, 3940, -4277, 4354, -4592, -4591, 4878, 4879, -5245, 5317, 5318, 5319, 5207, 5208, 5307, 5308, 5510, 5511, 5496, 5497, 5323, 5321, -4751, -4750, -4749, 4628, -4026, 3577, -3100, -3099, 2981, 2982, -2194, -2137, -2136, -2135]]
                    }, {
                        "type": "Polygon",
                        "id": 9,
                        "arcs": [[-2172, -2171, -2170, -2018, -2017, 2317, 2318, -2457, 2526, 2527, 2557, 2559, 9881, 2561, 2547, 2548, 2549, -2285, -2284, -1998]]
                    }, {
                        "type": "Polygon",
                        "id": 11,
                        "arcs": [[4385, 4386, -4115, -4297]]
                    }, {
                        "type": "Polygon",
                        "id": 10,
                        "arcs": [[3752, 4102, 4392, 4393, 4394, 4395, 4396, 4397, -4267, 4100, 4101, -4079, 3754, 3755, -3497, -3588, 3756, -3586]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 12,
                        "arcs": [[[9361]], [[9338]], [[9063]], [[9882, 9883]], [[8993, 8905]], [[9884, 9356, 9885, 9358, 9362, 9351, 9340, 9331, 9302, 9329, 9304, 9285, 9264, 9262, 9235, 9221, 9193, 9886, 9137, 9363, 8968, 8865, 8969, 9065, 9006, 9064, 9008, 8913, 9009, 8915, 8804, 9887, 8806, 8797, 8790, 8787, -8676, -8686, -8685, -8684, -8568, -8567, -8691, -8690, -8689, -8682, -8745, -8744, -8733, -8737, -8736, -8743, -8742, -8740, -8739, -8762, 8875, -8760, -8828, -8827, -8697, -8696, -8600, -8747, -8746, -8707, 8835, 8906, 9013, 9099, 9139, 9161, 9152, 9098, 8991, 8903, 8992, 9888, 8988, 9116, 9153, 9204, 9889, 9206, 9146, 9200, 9276, 9296, 9890, 9298, 9326, 9891, 9322, 9892, 9324, 9332, 9353, 9360]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 13,
                        "arcs": [[[8704]], [[9893, 8606]], [[8522]], [[8333]], [[8283]], [[8284]], [[8523, 8607, 9894, 8609, 8705, 8706, 8745, 8746, 8599, 8695, 8696, 8826, 8827, 8759, -8876, 8761, 8738, 8739, 8741, 8742, 8735, 8736, 8732, 8743, 8744, -8681, 8578, -8484, 8482, -8322, -8321, 8292, -8195, 8156, 8110, -8062, 8017, -7872, 7845, -7700, -7699, 7573, -7494, -7493, 7419, -7206, 7170, 7167, -7028, 6997, 6993, -6975, -6806, -6721, -6720, -6719, -6795, -6794, -6828, -6827, -6823, -6822, -6886, -6885, -6884, -6802, -6673, -6924, -6923, -6922, -6921, -6920, -7061, -7060, -7256, 7339, -7438, -7437, -7484, -7483, -7542, -7541, -7711, 7821, -7868, -7867, 7891, -7899, -8057, -8056, -8055, 8285, 8280, 8336]]]
                    }, {
                        "type": "Polygon",
                        "id": 19,
                        "arcs": [[-1566, 1654, -1696, -1780, -1779, 2023, -2098, 2159, -2230, 2312, 2313, -2452, -2451, -2450, 2717, -2767, 2921, -2928, 3117, 3118, 3078, 3079, 3081, 3082, 3093, 3094, 3091, 3092, 3088, 3089, 3085, 3086, 3075, 3076, 3072, 3073, 3069, 3070, -2935, 2880, -2829, 2659, 2660, -2543, 2416, -2304, 2207, -2191, 2065, 2066, -1834, -1833, 1756, -1660, 1651, -1521, -1490, -1494, -1493, -1517, -1516, -1515, -1526, -1525, -1519, -1518, -1497, -1496, -1502, -1501, -1500, -1513, -1512, -1505, -1504]]
                    }, {
                        "type": "Polygon",
                        "id": 16,
                        "arcs": [[20, -36, 111, -202, 240, -350, -329, -328, 518, -528, -737, -736, -735, -758, -652, 1121, -1174, -1173, 1592, -1734, -1733, 2052, 2141, 2107, 2108, 2021, 2022, 1896, 1580, 1581, -1263, -1262, -1261, 1091, -970, 914, -709, 522, 535, 536, -396, -395, 364, -248, -247, 114, -82, 22, 23]]
                    }, {
                        "type": "Polygon",
                        "id": 17,
                        "arcs": [[-1968, -1967, -1948, -1947, -1953, -1952, -1960, -1959, -2030, -2029, 2116, 2233, 2234, 2235, 2510, -2533, 2774, -2825, 2957, -3156, 3323, 3324, -3546, 3727, -3919, 4027, -4173, 4238, -4445, -4444, 4683, -4705, 4905, -4930, 5135, -5171, 5358, 5359, 5361, -5492, 5562, 5574, 5575, 5568, 5569, 5570, -5351, -5350, -5160, 5125, 4935, 4936, 4726, 4727, -4456, -4455, -4521, 4379, 4380, 4381, 4165, 4070, 4071, -3929, 3750, 3751, -3685, 3515, -3493, 3241, 3242, -3118, 2927, -2922, 2766, -2718, 2449, 2450, 2451, -2314, -2313, 2229, -2160, 2097, -2024, -1778]]
                    }, {
                        "type": "Polygon",
                        "id": 18,
                        "arcs": [[-2297, -2296, -2291, -2290, -2295, 2470, -2539, 2621, -2717, 2793, 2794, -3019, 3039, -3168, 3291, -3407, -3406, 3614, -3716, 3808, -3932, -4139, 4144, -4266, -4265, 4422, 4423, 4432, 4433, -4557, 4659, 4660, 4805, 4798, 4799, 4800, 4795, 4892, 4893, 4894, 4953, 4954, 4923, 4924, 4973, 4974, 4927, 4928, 4929, -4906, 4704, -4684, 4443, 4444, -4239, 4172, -4028, 3918, -3728, 3545, -3325, -3324, 3155, -2958, 2824, -2775, 2532, -2511, -2236, 2533, 2535, 2467, -2204, -2203, -2300, -2299]]
                    }, {
                        "type": "Polygon",
                        "id": 20,
                        "arcs": [[-3419, -3431, -3429, -3428, -3423, -3422, -3433, -3432, -3413, -3412, -3410, -3409, -3417, -3416, -3426, -3427, -3317, -3316, -3486, -3485, -3490, -3489, -3488, -3492, -3561, 3664, -3762, 3884, -4003, -4002, -4046, -4199, -4198, 4346, -4501, 4546, -4772, 4820, -5042, -5041, 5300, 5301, -5544, 5556, 5557, 5558, 5531, 5532, 5523, 5524, 5592, 5593, 5446, 5447, 5449, 5450, 5526, 5527, 5459, 5460, 5528, 5529, 5456, 5457, 5453, 5520, 5521, 5519, 5516, 5517, -5318, 5244, -4880, -4879, 4590, 4591, -4355, 4276, -3941, -3940, 3619, -3365, -3420]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 21,
                        "arcs": [[[-4137, -4136, -4161, -4160, -4159, -4182, -4181, -4351, -4350, -4373, -4372, -4498, -4497, 4744, -4805, -4804, -5103, -5102, 5233, 5234, 5235, 5611, -5643, 5726, 5826, 5827, 5819, 5820, 5824, 5825, 5807, 5808, 5882, 5883, 5835, 5913, 5914, 5838, 5839, 5891, 5892, 5696, 5698, 5699, 5658, 5659, 5737, 5937, 5938, 5831, 5832, 5932, 5933, 5957, 5958, -5897, -5709, -5708, -5707, 5632, -5569, -5576, -5575, -5563, 5491, -5362, -5360, -5359, 5170, -5136, -4929, -4928, -4975, -4974, -4925, -4924, -4955, -4954, -4895, -4894, -4893, -4796, -4801, -4800, -4799, -4806, -4661, -4660, 4556, -4434, -4433, -4424, -4423, 4264, 4265, -4145, -4138]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 22,
                        "arcs": [[[9108]], [[9088]], [[9046]], [[9028]], [[9899, 9025, 9089, 9003, 9084, 9900, 9078, 9901, 9080, 9902, 9082, 9109, 9070, 9049, 9037, 9060, -9017, -8995, 8942, -8693, -8692, 8649, 8456, 8457, -8406, 8237, -8223, 7906, 7907, 7908, -7820, -7645, -7644, -7721, -7720, -7735, -7734, -7796, -7795, -7778, -7667, -7666, -7665, -7928, 7943, -8109, -8108, -8107, -8106, 8274, 8275, 8276, 8491, 8492, -8647, -8646, -8661, -8660, -8659, -8664, -8663, -8665, -8632, -8771, -8770, 8846, 8847, 9010, 9027]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 25,
                        "arcs": [[[2727]], [[2632]], [[2175, 2248, 2249, 2250, 2251, 2252, 2168, 2015, 2016, 2017, 2169, 2170, 2171, 1997, 1998, 1999, -1887, -1737, -1736, -1754, -1807, -1806, -1783, -1782, -1781, -1749, 1934, 9903, 2006, 9904, 2008, 2118, 2165, 2177, 9905, 2173, 2287]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 24,
                        "arcs": [[[4166]], [[4781, 4782, 4856, 4857, 4858, 4690, 4581, 4268, 4408, 4169, 4080, 3824, 3834, 3840, 4088, 4192, 9906, 4194, 4521, 4293, 4613, 4731, 4615, 4295, 4296, 4114, 4115, 4116, 3849, 3811, 3812, 3813, 3814, 3816, 3817, 3818, 3820, 3821, 3822, -3547, -3461, -3460, -3445, -3537, -3536, -3458, -3457, -3584, -3583, -3501, -3500, -3499, -3449, -3448, -3498, -3756, -3755, 4078, -4102, -4101, 4266, -4398, -4397, -4396, 4784]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 23,
                        "arcs": [[[918]], [[919]], [[1288, 1134, 1392, 1380, 1390, 1382, 1537, 1538, -1300, -889, 889, 890, 891, 817, 567, 360, 813, 920, 599, 1117, 1282, 1286, 1391]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 26,
                        "arcs": [[[9402]], [[9401]], [[771, 820, 9406, 1075, 1236, 9407, 1434, 1560, 1561, 9408, 1578, 9409, 1927, 9410, 9412, -2505, 2280, 2281, 2292, 2293, 2294, 2289, 2290, 2295, 2296, 2298, 2299, 2202, 2203, 2204, 2151, 1988, 1785, 1686, 1533, 1378, 1225, 1112, 9404, 9405, 948, 9400, 9399]], [[9395]], [[9388, 9389]], [[9390]], [[9377, 446, 9382, 9384, 491, 9394, 9907, 9392, 9396, 9397, 574, 9385, 712, 713, 714, 639, 640, 587, 588, 589, 590, 476, 477, 478, 479, 480, 481, 482, 483, 484, 434, 9378]], [[9373, 9379, 9375]], [[9376]]]
                    }, {
                        "type": "Polygon",
                        "id": 27,
                        "arcs": [[125, 151, 204, 9366, 9365, 203, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 473, 592, 593, 594, -667, 794, -800, 901, 902, 1050, -1075, 1139, -1162, -1187, -1186, -1191, 1370, -1423, 1502, 1503, 1504, 1511, 1512, 1499, 1500, 1501, 1495, 1496, 1517, 1518, 1524, 1525, 1514, 1515, 1516, 1492, 1493, 1489, 1490, 1336, -1220, 1179, -1044, -1043, 917, -893, 840, -746, 702, -551, 546, 415, -404, 348, -318, 218, -210, 164, 165, -55, 60, 106, 9364]]
                    }, {
                        "type": "Polygon",
                        "id": 29,
                        "arcs": [[-3119, -3243, -3242, 3492, -3516, 3684, -3752, -3751, 3928, -4072, -4071, -4166, -4382, -4381, -4380, 4520, 4454, 4455, -4728, -4727, -4937, -4936, -5126, 5159, 5349, 5350, -5571, -5570, -5633, 5706, 5707, 5708, 5896, 5897, 5898, 5899, -6100, 6161, 6162, 5968, 5969, 5970, 5971, 5972, 5865, 5915, 5916, 5885, 5886, 5887, 5715, 5929, 5930, 5931, 5918, 5919, 5920, 5815, 5841, 5842, 5935, 5936, -5766, 5719, -5557, 5543, -5302, -5301, 5040, 5041, -4821, 4771, -4547, 4500, -4347, 4197, 4198, 4045, 4001, 4002, -3885, 3761, -3665, 3560, 3491, -3487, -3304, 3273, -3129, -3070, -3074, -3073, -3077, -3076, -3087, -3086, -3090, -3089, -3093, -3092, -3095, -3094, -3083, -3082, -3080, -3079]]
                    }, {
                        "type": "Polygon",
                        "id": 28,
                        "arcs": [[-6755, -6754, -6938, 6953, 6950, -7180, 7256, -7303, 7420, -7449, 7598, -7679, 7825, -7956, -7955, 8127, -8251, -8250, 8435, -8522, 8619, -8704, -8703, 8838, 8861, 8880, -8847, 8769, 8770, 8631, 8664, 8662, 8663, 8658, 8659, 8660, 8645, 8646, -8493, -8492, -8277, -8276, -8275, 8105, 8106, 8107, 8108, -7944, 7927, -7664, -7663, 7413, 7414, -7134, -7133, 7026, -7016, -6737, -6736, -6768, -6767, -6772, -6771, -6743, -6742, -6741, -6773]]
                    }, {
                        "type": "Polygon",
                        "id": 30,
                        "arcs": [[43, 99, 88, 46, 50, 29, 9, 53, 110, -93, 108, -133, 221, -231, 373, -381, 514, 515, 516, 675, 676, 677, 763, 764, 765, 697, 698, 826, 827, 655, 649, 650, 651, 757, 734, 735, 736, 527, -519, 327, 328, 349, -241, 201, -112, 35, -21, 36, 19]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 37,
                        "arcs": [[[-5845, 6042, 6259, 6044]], [[6047, 6086, 6179, 6194, 6038, 6056, 6247, 6431, 6425, 6582, 6258, 6583, 6564, 6492, 6560, 6804, 6761, 6831, 6759, 6893, 6990, 7112, 7271, 9920, 7273, 7279, 7280, 7281, 7282, 7252, 7005, 7006, 7007, 6928, 6877, 6846, 6847, 6852, 6853, 6676, 6677, 6756, 6645, 6646, 6630, 6631, 6768, 6769, 6695, 6749, 6750, 6751, 6671, 6672, 6801, 6883, 6884, 6885, 6821, 6822, 6823, -6595, -6594, -6457, -6456, -6392, -6391, -6287, -6286, -6285, 6174, -6175, -6174, -6233, -6232, -6231, -6084, -6083, -5987, -5986, -5985, -5928, -5927, -5926, -5854, -5896, -5895, -5911, -5910, -5674, -5673, -5963, -5671, -5714, -5713, -5712, -5882, -5881, -5880, -5725, -5724, -5876, -5805, -5804, -5803, -5871, -5870, -5908, -5907, -5849, 6041]]]
                    }, {
                        "type": "Polygon",
                        "id": 38,
                        "arcs": [[54, -166, -165, 209, -219, 317, -349, 403, -416, -547, 550, 551, 627, 628, 633, 634, 631, 632, 530, 583, 623, 624, 625, 635, -516, -515, 380, -374, 230, -222, 132, -109, 92, 93, 98, 103, 40, 32, 64, 68, 57]]
                    }, {
                        "type": "Polygon",
                        "id": 31,
                        "arcs": [[-1710, -1552, -1682, -1681, -1672, -1671, -1812, -1810, -1809, -1839, -1838, -1836, -1835, -2067, -2066, 2190, -2208, 2303, -2417, 2542, -2661, -2660, 2828, -2881, 2934, -3071, 3128, -3274, 3303, 3486, 3487, 3488, 3489, 3484, 3485, 3315, 3316, 3426, 3425, 3415, 3416, 3408, 3409, 3411, 3412, 3431, 3432, 3421, 3422, 3427, 3428, 3430, 3418, 3419, -3364, 3193, -3140, 2970, 2971, 2822, 2700, 2701, 2731, 2732, -2551, 2541, -2048, -2047, 1861, -1644, -1684, -1683, -1574, -1573, -1709]]
                    }, {
                        "type": "Polygon",
                        "id": 33,
                        "arcs": [[-890, 888, 1299, -1539, 1615, 1747, 1748, 1780, 1781, 1782, 1805, 1806, -1753, 1614, -1456, 1269, 1270, -1115, -996, 899, 900, -891]]
                    }, {
                        "type": "Polygon",
                        "id": 34,
                        "arcs": [[9921, 3944, 3785, 3786, 3787, 3788, 3789, 3726, 3668, 3524, 3525, -3254, -3253, 3124, 2911, 2912, -2814, 2756, -2603, -2568, -2567, -2770, -2769, 2897, 3116, 3066, 3156, 3256, 3346, 3531, 3521, 3805, 4124, 3946]]
                    }, {
                        "type": "Polygon",
                        "id": 35,
                        "arcs": [[5784, 5785, 5786, -6372, 6554, 6555, -6863, 7008, 7009, 7156, 7157, -7563, 7653, 7654, 7655, 7656, 7657, 7967, 7968, 7969, 7783, 7784, 7785, 7888, 7889, 8111, 8037, 8038, -7593, -7592, 7176, -5782, -5781, -5780, 5778, -5322, -5324, -5498, -5497, -5512, -5511, -5309, -5308, -5209, -5208, -5320]]
                    }, {
                        "type": "Polygon",
                        "id": 32,
                        "arcs": [[-2023, -2357, 2361, -2921, 3561, 3562, -3998, 4621, 4622, 4623, 4624, 5911, 5912, -5467, 4254, 4772, -4569, 4323, 3801, 4307, 4308, 4309, -4131, -4130, 2391, 2392, 2393, 2394, -2384, -1603, -1429, -1428, -1264, -1582, -1581, -1897]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 36,
                        "arcs": [[[3237]], [[3052, 9922, 3054, 3119, 3152, 3121, 3056, 2782]], [[1826]], [[3046, 3097, 3048, 2751, 2629, 2770, 2768, 2769, 2566, 2567, 2568, 2324, 2325, 2093, 2153, 2154, 2156, 2157, 2188, 2189, 2056, 2057, 2088, 2089, 2085, 2086, 2060, 2061, 2062, 1831, 1716, 1713, 1721, 1724, 1701, 1570, 1279, 9923, 1281, 1275, 1276, 1019, 1031, 1005, -1001, 1002, -1132, 1204, -1296, -1485, 1544, -1738, 1886, -2000, -1999, 2283, 2284, -2550, -2549, 2752]]]
                    }, {
                        "type": "Polygon",
                        "id": 39,
                        "arcs": [[2397, -2447, 2666, -2675, 2898, -2906, 3033, 3034, -3246, 3262, 3263, -3520, 3528, -3609, 3737, 3738, 3893, 3894, 3895, 3992, -4069, 4228, 4226, 4362, 4363, 4494, 4495, 4496, 4497, 4371, 4372, 4349, 4350, 4180, 4181, 4158, 4159, 4160, 4135, 4136, 4137, 4138, 3931, -3809, 3715, -3615, 3405, 3406, -3292, 3167, -3040, 3018, -2795, -2794, 2716, -2622, 2538, -2471, -2294, -2293, -2282, -2281, 2504, 2505, 2506, 2507, 2508, 2509, 2514, 9926, 2516, 2669, 2593, 2594, 2595, 2636, 2579, 2443, 2401, -2200]]
                    }, {
                        "type": "Polygon",
                        "id": 40,
                        "arcs": [[-5458, -5457, -5530, -5529, -5461, -5460, -5528, -5527, -5451, -5450, -5448, -5447, -5594, -5593, -5525, -5524, -5533, -5532, -5559, -5558, -5720, 5765, -5937, 5945, -6118, -6257, 6315, -6551, 6610, -6728, 6773, 6774, -7119, 7231, 7232, 7233, 7234, 7401, 7402, 7398, 7399, 7400, 7380, 7440, 7441, 7442, 7337, 7338, 7229, 7230, 7139, 7140, 7035, 7036, 6930, 6931, -6871, 6691, -6627, 6398, -6366, 6016, 6017, 5798, 5799, 5794, 5795, 5796, 5791, 5792, -5785, -5319, -5518, -5517, -5520, -5522, -5521, -5454]]
                    }, {
                        "type": "Polygon",
                        "id": 41,
                        "arcs": [[661, -608, 658, -691, -604, -603, -696, -695, -694, -693, -692, -503, -502, -557, -555, -554, -513, -583, -536, -523, 708, -915, 969, -1092, 1260, 1261, 1262, 1263, 1427, 1428, 1602, 1603, 1599, 1600, 1881, 1973, 1974, 1892, 1893, 1611, 1464, 1298, 980, 776, 622]]
                    }, {
                        "type": "Polygon",
                        "id": 42,
                        "arcs": [[-2061, -2087, -2086, -2090, -2089, -2058, -2057, -2190, -2189, -2158, -2157, -2155, -2154, -2094, -2326, -2325, -2569, 2602, -2757, 2813, -2913, -2912, -3125, 3252, 3253, -3526, 3553, 3584, 3585, -3757, 3587, 3496, 3497, 3447, 3448, 3498, 3499, 3500, 3582, 3583, 3456, 3457, 3535, 3536, 3444, 3459, 3460, 3546, 3547, 3548, 3610, 3611, -3610, 3337, 3338, 3339, -3244, 3106, -3034, 2905, -2899, 2674, -2667, 2446, -2398, 2199, 2200, -2062]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 44,
                        "arcs": [[[2544]], [[2545, -2250]], [[-2253, -2252, 2452, 2321, 2454, 2553, -2527, 2456, -2319, -2318, -2016, -2169]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 45,
                        "arcs": [[[8077]], [[8079]], [[8080]], [[7693, 9413, 9930, 9415, 7862, 8081, 8046, 9931, 8048, 9932, 8050, 8078, 8053, 8054, 8055, 8056, 7898, -7892, 7866, 7867, -7822, 7710, 7540, 7541, 7482, 7483, 7436, 7437, -7340, 7255, 7059, 7060, 6919, 6920, 6921, 6922, 6923, -6672, -6752, -6751, -6750, -6696, -6770, -6769, -6632, -6631, -6647, -6646, -6757, -6678, -6677, -6854, -6853, -6848, -6847, -6878, -6929, -7008, -7007, -7006, -7253, -7283, 7328, 7588, 9416]]]
                    }, {
                        "type": "Polygon",
                        "id": 46,
                        "arcs": [[-624, -584, -531, -633, -632, -635, -634, -629, -628, -552, -703, 745, -841, 892, -918, 1042, 1043, -1180, 1219, -1337, -1491, 1520, -1652, 1659, -1757, 1832, 1833, 1834, 1835, 1837, 1838, 1808, 1809, 1811, 1670, 1671, 1680, 1681, 1551, 1709, 1708, 1572, 1573, 1682, 1683, -1643, 1487, -1374, 1248, 1183, -1033, 939, -677, -676, -517, -636, -626, -625]]
                    }, {
                        "type": "Polygon",
                        "id": 47,
                        "arcs": [[-5660, -5659, -5700, -5699, -5697, -5893, -5892, -5840, -5839, -5915, -5914, -5836, -5884, -5883, -5809, -5808, -5826, -5825, -5821, -5820, -5828, -5879, -5878, -5891, -5890, -5889, -5859, -5983, -5863, -5862, -5929, 5984, 5985, 5986, 6082, 6083, 6230, 6231, 6232, 6173, 6174, -6175, 6284, 6285, 6286, 6390, 6391, 6455, 6456, 6593, 6594, -6824, 6826, 6827, 6793, 6794, 6718, 6719, 6720, 6805, 6806, 6790, 6791, 6784, 6785, 6723, 6724, 6713, 6698, 6752, 6753, 6754, 6772, 6740, 6741, 6742, 6770, 6771, 6766, 6767, -6735, 6604, -6410, -6409, -6408, -6407, 6273, -6162, 6099, -5900, -6101, -5898, -5959, -5958, -5934, -5933, -5833, -5832, -5939, -5938, -5738]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 48,
                        "arcs": [[[9933]], [[9311, 9312]], [[9313, 9290, 9934, 9292, 9314]], [[9271]], [[9242]], [[9935, 9214]], [[9128]], [[9132, 9175, 9936, 9164, 9217, 9166, 9937, 9168, 9179, 9216, 9227, 9247, 9938, 9249, 9229, 9243, 9254, 9246, 9255, 9939, 9257, 9273, 9293, 9318, 9347, 9352, 9345, 9342, 9310, 9253, 9190, 9127, 8977, 8872, 8869, 8883, 8392, 8394, -7889, -7786, -7785, -7784, -7970, -7969, -7968, -7658, -7657, -7656, -7655, -7654, 7562, -7158, -7157, -7010, -7009, 6862, -6556, -6555, 6371, -5787, -5786, -5793, -5792, -5797, -5796, -5795, -5800, -5799, -6018, -6017, 6365, -6399, 6626, -6692, 6870, -6932, -6931, -7037, -7036, -7141, -7140, -7231, -7230, -7339, -7338, -7443, -7442, -7441, -7381, -7401, -7400, -7399, -7403, -7402, -7235, -7234, -7514, 7610, -7646, 7819, -7909, -7908, -7907, 8222, -8238, 8405, -8458, -8457, -8650, 8691, 8692, -8943, 8994, 9016, 9017, 9090, 9131, 9092, 9020, 9130]]]
                    }, {
                        "type": "Polygon",
                        "id": 49,
                        "arcs": [[-1732, 2343, -2621, -2196, -2195, -2983, -2982, 3098, 3099, -3578, 4025, -4629, 4748, 4749, 4750, 4751, 4752, 4753, 5415, 5416, 5342, -4624, -4623, -4622, 3997, -3563, -3562, 2920, -2362, 2356, -2022, -2109, -2108, -2142, -2053]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 51,
                        "arcs": [[[5405, 5058, -4782, 5059]], [[5005, 4865, 4807, 4982, 5225, 5370, 5424, 5372, 5109, 5148, 5330, 5473, 5536, 9940, 5683, 5638, 5472, 5431, 5282, 5394, 9941, 5581, 5626, 5665, 5871, 9942, 5902, 9943, 9944, 5905, 5850, 5823, 5851, 5844, 5845, 5846, 5847, 5848, 5906, 5907, 5869, 5870, 5802, 5803, 5804, 5875, 5723, 5724, 5879, 5880, 5881, 5711, 5712, 5713, 5670, 5962, 5672, 5673, 5909, 5910, 5894, 5895, 5853, 5925, 5926, 5927, 5928, 5861, 5862, 5982, 5858, 5888, 5889, 5890, 5877, 5878, -5827, -5727, 5642, -5612, -5236, -5235, -5234, -5101, -5412, -5411, -5378, -5377, -5376, -5180, -5275, -5274, 5122, -4883, 4877, -4536, -4535, -4403, -4402, -4401, -4189, -4188, 4043, -3999, -3865, -3910, -4025, -4024, -3812, -3850, -4117, -4116, -4387, 4417, 9945, 4342, 4409, 4669, 4810, 4866, 5063, 5188]]]
                    }, {
                        "type": "Polygon",
                        "id": 50,
                        "arcs": [[1008, 998, -900, 995, 1114, -1271, -1270, 1455, -1615, 1752, 1753, 1735, 1736, 1737, -1545, 1484, 1295, -1205, 1131, -1003, 1000, 1001, 994]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 53,
                        "arcs": [[[303]], [[271]], [[184]], [[118]], [[119]], [[120]], [[126, 2, 3, 75, 85, 80, 83, -23, 81, -115, 246, 247, -365, 394, 395, -537, 582, 512, 553, 554, 556, 501, 502, 691, 692, 693, 694, 695, 602, 603, 690, -659, 607, 608, 610, 467, 343, 233, 186, 187, 234, 319, 276, 371, 273, 372, 321, 407, 370, 307, 196, 183, 197, 129]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 55,
                        "arcs": [[[9372]], [[9371, 561, 557, -484, -483, -482, -481, -480, -479, -478, -477, -591, -590, -589, -588, -641, -640, -715, 9386, 879, 9949, 881, 1155, 1167, 9387, 1165, 1289, 1474, 1623, 1800, 1960, 2027, 2028, 2029, 1958, 1959, 1951, 1952, 1946, 1947, 1966, 1967, 1777, 1778, 1779, 1695, -1655, 1565, -1503, 1422, -1371, 1190, 1185, 1186, 1161, -1140, 1074, -1051, -903, -902, 799, -795, 666, -595, -594, -593, -474, -148, 9368, 9370]]]
                    }, {
                        "type": "Polygon",
                        "id": 54,
                        "arcs": [[3243, -3340, -3339, -3338, 3609, -3612, -3611, -3549, -3548, -3823, -3822, -3821, -3819, -3818, -3817, -3815, -3814, -3813, 4023, 4024, 3909, 3864, 3998, -4044, 4187, 4188, 4400, 4401, 4402, 4534, 4535, -4878, 4882, -5123, 5273, 5274, 5179, 5375, 5376, 5377, 5410, 5411, 5100, 5101, 5102, 4803, 4804, -4745, -4496, -4495, -4364, -4363, -4227, -4229, 4068, -3993, -3896, -3895, -3894, -3739, -3738, 3608, -3529, 3519, -3264, -3263, 3245, -3035, -3107]]
                    }, {
                        "type": "Polygon",
                        "id": 56,
                        "arcs": [[-827, -699, -698, -766, -765, -764, -678, -940, 1032, -1184, -1249, 1373, -1488, 1642, 1643, -1862, 2046, 2047, -2542, 2550, 2551, 2552, 2139, 2140, 2134, 2135, 2136, 2193, 2194, 2195, 2620, -2344, 1731, 1732, 1733, -1593, 1172, 1173, -1122, -651, -650, -656, -828]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 78,
                        "arcs": [[[9867]], [[9840]]]
                    }]
                },
                "land": {
                    "type": "MultiPolygon",
                    "arcs": [[[9361]], [[9933]], [[9338]], [[9311, 9312]], [[9313, 9290, 9934, 9292, 9314]], [[9271]], [[9242]], [[9935, 9214]], [[9128]], [[9108]], [[9088]], [[9046]], [[9063]], [[9882, 9883]], [[9028]], [[8993, 8905]], [[8704]], [[9893, 8606]], [[8522]], [[8333]], [[8283]], [[8284]], [[8077]], [[8079]], [[8080]], [[7053]], [[7019]], [[7054]], [[6896]], [[6897]], [[4166]], [[3237]], [[3052, 9922, 3054, 3119, 3152, 3121, 3056, 2782]], [[2727]], [[2632]], [[2544]], [[1826]], [[918]], [[919]], [[9402]], [[9401]], [[9395]], [[9388, 9389]], [[9390]], [[9372]], [[9373, 9379, 9375]], [[-9918]], [[1275, 1276, 1019, 1031, 1005, 1001, 994, 1008, 998, 900, 891, 817, 567, 360, 813, 920, 599, 1117, 1282, 1286, 1391, 1288, 1134, 1392, 1380, 1390, 1382, 1537, 1615, 1747, 1934, 9903, 2006, 9904, 2008, 2118, 2165, 2177, 9905, 2173, 2287, 2175, 2248, 2545, 2250, 2452, 2321, 2454, 2553, 2527, 2557, 2559, 9881, 2561, 2547, 2752, 3046, 3097, 3048, 2751, 2629, 2770, 2897, 3116, 3066, 3156, 3256, 3346, 3531, 3521, 3805, 4124, 3946, 9921, 3944, 3785, 9954, 3787, 9955, 3789, 3726, 3668, 3524, 3553, 3584, 3752, 4102, 4392, 9956, 4394, 4784, 5059, 5405, 5058, 4782, 4856, 9957, 4858, 4690, 4581, 4268, 4408, 4169, 4080, 3824, 3834, 3840, 4088, 4192, 9906, 4194, 4521, 4293, 4613, 4731, 4615, 4295, 4385, 4417, 9945, 4342, 4409, 4669, 4810, 4866, 5063, 5188, 5005, 4865, 4807, 4982, 5225, 5370, 5424, 5372, 5109, 5148, 5330, 5473, 5536, 9940, 5683, 5638, 5472, 5431, 5282, 5394, 9941, 5581, 5626, 5665, 5871, 9942, 5902, 9943, 9944, 5905, 5850, 5823, 5851, 6042, 6259, 6044, 5845, 9958, 9959, 9960, 5847, 6041, 6047, 6086, 6179, 6194, 6038, 6056, 6247, 6431, 6425, 6582, 6258, 6583, 6564, 6492, 6560, 6804, 6761, 6831, 6759, 6893, 6990, 7112, 7271, 9920, 7273, 7279, 9961, 7281, 7328, 7588, 9416, 7693, 9413, 9930, 9415, 7862, 8081, 8046, 9931, 8048, 9932, 8050, 8078, 8053, 8285, 8280, 8336, 8523, 8607, 9894, 8609, 8705, 8835, 8906, 9013, 9099, 9139, 9161, 9152, 9098, 8991, 8903, 8992, 9888, 8988, 9116, 9153, 9204, 9889, 9206, 9146, 9200, 9276, 9296, 9890, 9298, 9326, 9891, 9322, 9892, 9324, 9332, 9353, 9360, 9884, 9356, 9885, 9358, 9362, 9351, 9340, 9331, 9302, 9329, 9304, 9285, 9264, 9262, 9235, 9221, 9193, 9886, 9137, 9363, 8968, 8865, 8969, 9065, 9006, 9064, 9008, 8913, 9009, 8915, 8804, 9887, 8806, 8797, 8790, 8787, 8676, 9880, 8678, 8701, 8838, 8861, 8880, 8847, 9010, 9027, 9899, 9025, 9089, 9003, 9084, 9900, 9078, 9901, 9080, 9902, 9082, 9109, 9070, 9049, 9037, 9060, 9017, 9090, 9131, 9092, 9020, 9130, 9132, 9175, 9936, 9164, 9217, 9166, 9937, 9168, 9179, 9216, 9227, 9247, 9938, 9249, 9229, 9243, 9254, 9246, 9255, 9939, 9257, 9273, 9293, 9318, 9347, 9352, 9345, 9342, 9310, 9253, 9190, 9127, 8977, 8872, 8869, 8883, 8392, 8394, 7889, 8111, 8037, 8208, 8504, 8191, 7725, 7740, 7697, 7519, 7056, 7020, 6899, 6528, 5874, 5606, 5291, 5193, 5288, 5438, 5155, 5018, 4853, 4552, 4697, 4472, 4696, 4474, 4482, 4847, 4484, 3626, 2685, 2373, 1893, 1611, 1464, 1298, 980, 776, 622, 661, 608, 610, 467, 343, 233, 186, 9946, 9962, 9948, 3, 75, 85, 80, 83, 23, 36, 19, 43, 99, 88, 46, 50, 29, 9, 53, 110, 93, 98, 103, 40, 32, 64, 68, 57, 60, 106, 9364, 125, 151, 204, 9366, 9365, 203, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 9368, 9370, 9371, 561, 557, 484, 434, 9378, 9377, 446, 9382, 9384, 491, 9394, 9907, 9392, 9396, 9397, 574, 9385, 712, 713, 9386, 879, 9949, 881, 1155, 1167, 9387, 1165, 1289, 1474, 1623, 1800, 1960, 2027, 2116, 2233, 2234, 2533, 2535, 2467, 2204, 2151, 1988, 1785, 1686, 1533, 1378, 1225, 1112, 9404, 9405, 948, 9400, 9399, 771, 820, 9406, 1075, 1236, 9407, 1434, 1560, 1561, 9408, 1578, 9409, 1927, 9410, 9412, 2505, -9912, 2507, -9910, 2509, 2514, 9926, 2516, 2669, 2593, 2594, 2595, 2636, 2579, 2443, 2401, 2200, 2062, 1831, 1716, 1713, 1721, 1724, 1701, 1570, 1279, 9923, 1281]], [[9612, 9619, 9600, 9610, 9536, 9547, 9542, 9545, 9501, 9528, 9516, 9644, 9518, 9525, 9874, 9527, 9503, 9875, 9505, 9543, 9508, 9544, 9540, 9546, 9538, 9611, 9602, 9606, 9596, 9607, 9591, 9608, 9581, 9571, 9609, 9872, 9493, 9479, 9465, 9873, 9463, 9480, 9468, 9481, 9475, 9567, 9471, 9568, 9559, 9628, 9624, 9622]], [[9489]], [[9626]], [[9552, 9521, 9870, 9523, 9551, 9533]], [[9561]], [[9499, 9529, 9871, 9531, 9497, 9534]], [[9869, 9550]], [[9455]], [[9515]], [[9447]], [[9563]], [[9514]], [[9491]], [[9445]], [[9555]], [[9554]], [[9440]], [[9586]], [[9510]], [[9444]], [[9434]], [[9513]], [[9512]], [[9588]], [[9511]], [[9431]], [[9548]], [[9642]], [[9460]], [[9438]], [[9562]], [[9432]], [[9470]], [[9451]], [[9589]], [[9487]], [[9458]], [[9426]], [[9553]], [[9437]], [[9524]], [[9492]], [[9500]], [[9441]], [[9435]], [[9490]], [[9592]], [[9439]], [[9625]], [[9486]], [[9485]], [[9488]], [[9442]], [[9452]], [[9443]], [[9597]], [[9454]], [[9436]], [[9453]], [[9585]], [[9483]], [[9449]], [[9428]], [[9456]], [[9446]], [[9620]], [[9603]], [[9459]], [[9448]], [[9457]], [[9450]], [[9594]], [[9583]], [[9584]], [[9582]], [[9476]], [[9587]], [[9605]], [[9604]], [[9484]], [[9627]], [[9461]], [[9560]], [[9429]], [[9427]], [[9433]], [[9593]], [[9430]], [[9629]], [[9630]], [[9631]], [[9632]], [[9633]], [[9634]], [[9466]], [[9635]], [[9636]], [[9637]], [[9638]], [[9639]], [[9640]], [[9509]], [[9467]], [[9641]], [[9643]], [[9867]], [[9866]], [[9840]], [[9813, 9697, 9666, 9723, 9817, 9718, 9726, 9759, 9868, 9839, 9877, 9737, 9820, 9731, 9847, 9853, 9844, 9863, 9864, 9855, 9865, 9834, 9848, 9782, 9878, 9822, 9803, 9689, 9746, 9830, 9705, 9790, 9823, 9668, 9768, 9779, 9660, 9761, 9879, 9654, 9788, 9832]], [[9417]], [[9422]], [[9421]], [[9423]], [[9876, 9420]], [[9424]], [[9425]], [[9418]]]
                }
            },
            "transform": {
                "scale": [0.00035892617892657177, 0.00005371486851395936],
                "translate": [-179.1473400003406, 17.67439566600018]
            }
        }
    };
}));

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/ChoroplethCounties.js',["d3", "topojson", "./Choropleth", "./us-counties"], factory);
    } else {
        root.map_ChoroplethCounties = factory(root.d3, root.topojson, root.map_Choropleth, root.map_usCounties);
    }
}(this, function (d3, topojson, Choropleth, usCounties) {
    var features = topojson.feature(usCounties.topology, usCounties.topology.objects.counties).features;
    var rFeatures = {};
    for (var key in features) {
        if (features[key].id) {
            rFeatures[features[key].id] = features[key];
        }
    }
    var fipsFormatter = d3.format("05d");
    function ChoroplethCounties() {
        Choropleth.call(this);

        this.projection("albersUsaPr");

        this._choroTopology = usCounties.topology;
        this._choroTopologyObjects = usCounties.topology.objects.counties;
    }
    ChoroplethCounties.prototype = Object.create(Choropleth.prototype);
    ChoroplethCounties.prototype.constructor = ChoroplethCounties;
    ChoroplethCounties.prototype._class += " map_ChoroplethCounties";

    ChoroplethCounties.prototype.publish("onClickFormatFIPS", false, "boolean", "format FIPS code as a String on Click");

    ChoroplethCounties.prototype.layerEnter = function (base, svgElement, domElement) {
        Choropleth.prototype.layerEnter.apply(this, arguments);

        this._selection.widgetElement(this._choroplethData);
        this.choroPaths = d3.select(null);
        var context = this;
        this
            .tooltipHTML(function (d) {
                return context.tooltipFormat({ label: usCounties.countyNames[d[0]], value: context._dataMap[d[0]] ? context._dataMap[d[0]][1] : "N/A" });
            })
        ;
    };

    ChoroplethCounties.prototype.layerUpdate = function (base) {
        Choropleth.prototype.layerUpdate.apply(this, arguments);
        this.choroPaths = this._choroplethData.selectAll(".data").data(this.visible() ? this.data() : [], function (d) { return d[0]; });
        var context = this;

        function eventRow(d) {
            return context.onClickFormatFIPS() ? context._dataMap[d[0]].map(function (cell, idx) {
                return context.onClickFormatFIPS() && idx === 0 ? fipsFormatter(cell) : cell;
            }) : context._dataMap[d[0]];
        }

        this.choroPaths.enter().append("path")
            .attr("class", "data")
            .call(this._selection.enter.bind(this._selection))
            .on("click", function (d) {
                if (context._dataMap[d[0]]) {
                    context.click(context.rowToObj(eventRow(d)), "weight", context._selection.selected(this));
                }
            })
            .on("dblclick", function (d) {
                if (context._dataMap[d[0]]) {
                    context.dblclick(context.rowToObj(eventRow(d)), "weight", context._selection.selected(this));
                }
            })
            .on("mouseout.tooltip", this.tooltip.hide)
            .on("mousemove.tooltip", this.tooltip.show)
        ;
        this.choroPaths
            .attr("d", function (d) {
                var retVal = base._d3GeoPath(rFeatures[d[0]]);
                if (!retVal) {
                    console.log("Unknown US County:  " + d);
                }
                return retVal;
            })
            .style("fill", function (d) {
                var retVal = context._palette(d[1], context._dataMinWeight, context._dataMaxWeight);
                return retVal;
            })
        ;
        this.choroPaths.exit().remove();
    };

    return ChoroplethCounties;
}));

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/ChoroplethCountries.js',["d3", "topojson", "./Choropleth", "./countries"], factory);
    } else {
        root.map_ChoroplethCountries = factory(root.d3, root.topojson, root.map_Choropleth, root.map_countries);
    }
}(this, function (d3, topojson, Choropleth, countries) {
    var features = topojson.feature(countries.topology, countries.topology.objects.countries).features;
    var rFeatures = {};
    for (var key in features) {
        if (features[key].id && countries.countryNames[features[key].id]) {
            rFeatures[countries.countryNames[features[key].id].name] = features[key];
        }
    }
    function ChoroplethCountries() {
        Choropleth.call(this);

        this._choroTopology = countries.topology;
        this._choroTopologyObjects = countries.topology.objects.countries;
    }
    ChoroplethCountries.prototype = Object.create(Choropleth.prototype);
    ChoroplethCountries.prototype.constructor = ChoroplethCountries;
    ChoroplethCountries.prototype._class += " map_ChoroplethCountries";

    ChoroplethCountries.prototype.layerEnter = function (base, svgElement, domElement) {
        Choropleth.prototype.layerEnter.apply(this, arguments);

        this._selection.widgetElement(this._choroplethData);
        this.choroPaths = d3.select(null);
        var context = this;
        this
            .tooltipHTML(function (d) {
                return context.tooltipFormat({ label: d[0], value: d[1] });
            })
        ;
    };

    ChoroplethCountries.prototype.layerUpdate = function (base) {
        Choropleth.prototype.layerUpdate.apply(this, arguments);

        this.choroPaths = this._choroplethData.selectAll(".data").data(this.visible() ? this.data() : [], function (d) { return d[0]; });
        var context = this;
        this.choroPaths.enter().append("path")
            .attr("class", "data")
            .call(this._selection.enter.bind(this._selection))
            .on("click", function (d) {
                if (context._dataMap[d[0]]) {
                    context.click(context.rowToObj(context._dataMap[d[0]]), "weight", context._selection.selected(this));
                }
            })
            .on("dblclick", function (d) {
                if (context._dataMap[d[0]]) {
                    context.dblclick(context.rowToObj(context._dataMap[d[0]]), "weight", context._selection.selected(this));
                }
            })
            .on("mouseout.tooltip", this.tooltip.hide)
            .on("mousemove.tooltip", this.tooltip.show)
        ;
        this.choroPaths
            .attr("d", function (d) {
                var retVal = base._d3GeoPath(rFeatures[d[0]]);
                if (!retVal) {
                    console.log("Unknown Country:  " + d);
                }
                return retVal;
            })
            .style("fill", function (d) {
                var retVal = context._palette(d[1], context._dataMinWeight, context._dataMaxWeight);
                return retVal;
            })
        ;
        this.choroPaths.exit().remove();
    };

    return ChoroplethCountries;
}));

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/us-states.js',[], factory);
    } else {
        root.map_usStates = factory();
    }
}(this, function () {
    return {
        stateNames: {
            "1": {
                "name": "Alabama",
                "code": "AL"
            },
            "2": {
                "name": "Alaska",
                "code": "AK"
            },
            "4": {
                "name": "Arizona",
                "code": "AZ"
            },
            "5": {
                "name": "Arkansas",
                "code": "AR"
            },
            "6": {
                "name": "California",
                "code": "CA"
            },
            "8": {
                "name": "Colorado",
                "code": "CO"
            },
            "9": {
                "name": "Connecticut",
                "code": "CT"
            },
            "10": {
                "name": "Delaware",
                "code": "DE"
            },
            "11": {
                "name": "District of Columbia",
                "code": "DC"
            },
            "12": {
                "name": "Florida",
                "code": "FL"
            },
            "13": {
                "name": "Georgia",
                "code": "GA"
            },
            "15": {
                "name": "Hawaii",
                "code": "HI"
            },
            "16": {
                "name": "Idaho",
                "code": "ID"
            },
            "17": {
                "name": "Illinois",
                "code": "IL"
            },
            "18": {
                "name": "Indiana",
                "code": "IN"
            },
            "19": {
                "name": "Iowa",
                "code": "IA"
            },
            "20": {
                "name": "Kansas",
                "code": "KS"
            },
            "21": {
                "name": "Kentucky",
                "code": "KY"
            },
            "22": {
                "name": "Louisiana",
                "code": "LA"
            },
            "23": {
                "name": "Maine",
                "code": "ME"
            },
            "24": {
                "name": "Maryland",
                "code": "MD"
            },
            "25": {
                "name": "Massachusetts",
                "code": "MA"
            },
            "26": {
                "name": "Michigan",
                "code": "MI"
            },
            "27": {
                "name": "Minnesota",
                "code": "MN"
            },
            "28": {
                "name": "Mississippi",
                "code": "MS"
            },
            "29": {
                "name": "Missouri",
                "code": "MO"
            },
            "30": {
                "name": "Montana",
                "code": "MT"
            },
            "31": {
                "name": "Nebraska",
                "code": "NE"
            },
            "32": {
                "name": "Nevada",
                "code": "NV"
            },
            "33": {
                "name": "New Hampshire",
                "code": "NH"
            },
            "34": {
                "name": "New Jersey",
                "code": "NJ"
            },
            "35": {
                "name": "New Mexico",
                "code": "NM"
            },
            "36": {
                "name": "New York",
                "code": "NY"
            },
            "37": {
                "name": "North Carolina",
                "code": "NC"
            },
            "38": {
                "name": "North Dakota",
                "code": "ND"
            },
            "39": {
                "name": "Ohio",
                "code": "OH"
            },
            "40": {
                "name": "Oklahoma",
                "code": "OK"
            },
            "41": {
                "name": "Oregon",
                "code": "OR"
            },
            "42": {
                "name": "Pennsylvania",
                "code": "PA"
            },
            "44": {
                "name": "Rhode Island",
                "code": "RI"
            },
            "45": {
                "name": "South Carolina",
                "code": "SC"
            },
            "46": {
                "name": "South Dakota",
                "code": "SD"
            },
            "47": {
                "name": "Tennessee",
                "code": "TN"
            },
            "48": {
                "name": "Texas",
                "code": "TX"
            },
            "49": {
                "name": "Utah",
                "code": "UT"
            },
            "50": {
                "name": "Vermont",
                "code": "VT"
            },
            "51": {
                "name": "Virginia",
                "code": "VA"
            },
            "53": {
                "name": "Washington",
                "code": "WA"
            },
            "54": {
                "name": "West Virginia",
                "code": "WV"
            },
            "55": {
                "name": "Wisconsin",
                "code": "WI"
            },
            "56": {
                "name": "Wyoming",
                "code": "WY"
            },
            "60": {
                "name": "American Samoa",
                "code": "AS"
            },
            "66": {
                "name": "Guam",
                "code": "GU"
            },
            "69": {
                "name": "Northern Mariana Islands",
                "code": "MP"
            },
            "72": {
                "name": "Puerto Rico",
                "code": "PR"
            },
            "78": {
                "name": "Virgin Islands",
                "code": "VI"
            }
        },
        topology: {
            type: "Topology",
            objects: {
                states: {
                    "type": "GeometryCollection",
                    "geometries": [{
                        "type": "MultiPolygon",
                        "id": 2,
                        "arcs": [[[9426]], [[9427]], [[9428]], [[9429]], [[9430]], [[9431]], [[9432]], [[9433]], [[9434]], [[9435]], [[9436]], [[9437]], [[9438]], [[9439]], [[9440]], [[9441]], [[9442]], [[9443]], [[9444]], [[9445]], [[9446]], [[9447]], [[9450]], [[9451]], [[9452]], [[9453]], [[9629]], [[9454]], [[9630]], [[9455]], [[9456]], [[9631]], [[9457]], [[9632]], [[9633]], [[9458]], [[9634]], [[9459]], [[9460]], [[9466]], [[9635]], [[9461]], [[9636]], [[9637]], [[9638]], [[9639]], [[9483]], [[9640]], [[9509]], [[9467]], [[9641]], [[9642]], [[9510]], [[9643]], [[9511]], [[9512]], [[9484]], [[9476]], [[9485]], [[9486]], [[9448]], [[9513]], [[9514]], [[9515]], [[9487]], [[9449]], [[9548]], [[9869, 9550]], [[9488]], [[9489]], [[9524]], [[9490]], [[9552, 9521, 9870, 9523, 9551, 9533]], [[9500]], [[9499, 9529, 9871, 9531, 9497, 9534]], [[9491]], [[9492]], [[9470]], [[9603]], [[9604]], [[9582]], [[9583]], [[9584]], [[9585]], [[9560]], [[9586]], [[9587]], [[9561]], [[9588]], [[9605]], [[9589]], [[9562]], [[9592]], [[9593]], [[9594]], [[9563]], [[9597]], [[9553]], [[9554]], [[9555]], [[9625]], [[9626]], [[9627]], [[9620]], [[9611, 9602, 9606, 9596, 9607, 9591, 9608, 9581, 9571, 9609, 9872, 9493, 9479, 9465, 9873, 9463, 9480, 9468, 9481, 9475, 9567, 9471, 9568, 9559, 9628, 9624, 9622, 9612, 9619, 9600, 9610, 9536, 9547, 9542, 9545, 9501, 9528, 9516, 9644, 9518, 9525, 9874, 9527, 9503, 9875, 9505, 9543, 9508, 9544, 9540, 9546, 9538]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 15,
                        "arcs": [[[9417]], [[9422]], [[9421]], [[9423]], [[9876, 9420]], [[9424]], [[9425]], [[9418]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 72,
                        "arcs": [[[9866]], [[9813, 9697, 9666, 9723, 9817, 9718, 9726, 9759, 9868, 9839, 9877, 9737, 9820, 9731, 9847, 9853, 9844, 9863, 9864, 9855, 9865, 9834, 9848, 9782, 9878, 9822, 9803, 9689, 9746, 9830, 9705, 9790, 9823, 9668, 9768, 9779, 9660, 9761, 9879, 9654, 9788, 9832]]]
                    }, {
                        "type": "Polygon",
                        "id": 1,
                        "arcs": [[-6786, -6785, -6792, -6791, -6807, 6974, -6994, -6998, 7027, -7168, -7171, 7205, -7420, 7492, 7493, -7574, 7698, 7699, -7846, 7871, -8018, 8061, -8111, -8157, 8194, -8293, 8320, 8321, -8483, 8483, -8579, 8680, 8681, 8688, 8689, 8690, 8566, 8567, 8683, 8684, 8685, 8675, 8676, 9880, 8678, 8701, 8702, 8703, -8620, 8521, -8436, 8249, 8250, -8128, 7954, 7955, -7826, 7678, -7599, 7448, -7421, 7302, -7257, 7179, -6951, -6954, 6937, -6753, -6699, -6714, -6725, -6724]]
                    }, {
                        "type": "Polygon",
                        "id": 5,
                        "arcs": [[-5843, -5842, -5816, -5921, -5920, -5919, -5932, -5931, -5930, -5716, -5888, -5887, -5886, -5917, -5916, -5866, -5973, -5972, -5971, -5970, -5969, -6163, -6274, 6406, 6407, 6408, 6409, -6605, 6734, 6735, 6736, 7015, -7027, 7132, 7133, -7415, -7414, 7662, 7663, 7664, 7665, 7666, 7777, 7794, 7795, 7733, 7734, 7719, 7720, 7643, 7644, 7645, -7611, 7513, -7233, -7232, 7118, -6775, -6774, 6727, -6611, 6550, -6316, 6256, 6117, -5946, -5936]]
                    }, {
                        "type": "Polygon",
                        "id": 4,
                        "arcs": [[-4752, -5779, 5779, 5780, 5781, -7177, 7591, 7592, -8039, 8208, 8504, 8191, 7725, 7726, 7305, 7306, -6522, -6521, -5912, -4625, -5343, -5417, -5416, -4754, -4753]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 6,
                        "arcs": [[[7053]], [[7019]], [[7054]], [[6896]], [[6897]], [[-1601, -1600, -1604, 2383, -2395, -2394, -2393, -2392, 4129, 4130, -4310, -4309, -4308, -3802, -4324, 4568, -4773, -4255, 5466, -5913, 6520, 6521, -7307, -7306, -7727, 7740, 7697, 7519, 7056, 7020, 6899, 6528, 5874, 5606, 5291, 5193, 5288, 5438, 5155, 5018, 4853, 4552, 4697, 4472, 4696, 4474, 4482, 4847, 4484, 3626, 2685, 2373, -1893, -1975, -1974, -1882]]]
                    }, {
                        "type": "Polygon",
                        "id": 8,
                        "arcs": [[-2141, -2140, -2553, -2552, -2733, -2732, -2702, -2701, -2823, -2972, -2971, 3139, -3194, 3363, 3364, -3620, 3939, 3940, -4277, 4354, -4592, -4591, 4878, 4879, -5245, 5317, 5318, 5319, 5207, 5208, 5307, 5308, 5510, 5511, 5496, 5497, 5323, 5321, -4751, -4750, -4749, 4628, -4026, 3577, -3100, -3099, 2981, 2982, -2194, -2137, -2136, -2135]]
                    }, {
                        "type": "Polygon",
                        "id": 9,
                        "arcs": [[-2172, -2171, -2170, -2018, -2017, 2317, 2318, -2457, 2526, 2527, 2557, 2559, 9881, 2561, 2547, 2548, 2549, -2285, -2284, -1998]]
                    }, {
                        "type": "Polygon",
                        "id": 11,
                        "arcs": [[4385, 4386, -4115, -4297]]
                    }, {
                        "type": "Polygon",
                        "id": 10,
                        "arcs": [[3752, 4102, 4392, 4393, 4394, 4395, 4396, 4397, -4267, 4100, 4101, -4079, 3754, 3755, -3497, -3588, 3756, -3586]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 12,
                        "arcs": [[[9361]], [[9338]], [[9063]], [[9882, 9883]], [[8993, 8905]], [[9884, 9356, 9885, 9358, 9362, 9351, 9340, 9331, 9302, 9329, 9304, 9285, 9264, 9262, 9235, 9221, 9193, 9886, 9137, 9363, 8968, 8865, 8969, 9065, 9006, 9064, 9008, 8913, 9009, 8915, 8804, 9887, 8806, 8797, 8790, 8787, -8676, -8686, -8685, -8684, -8568, -8567, -8691, -8690, -8689, -8682, -8745, -8744, -8733, -8737, -8736, -8743, -8742, -8740, -8739, -8762, 8875, -8760, -8828, -8827, -8697, -8696, -8600, -8747, -8746, -8707, 8835, 8906, 9013, 9099, 9139, 9161, 9152, 9098, 8991, 8903, 8992, 9888, 8988, 9116, 9153, 9204, 9889, 9206, 9146, 9200, 9276, 9296, 9890, 9298, 9326, 9891, 9322, 9892, 9324, 9332, 9353, 9360]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 13,
                        "arcs": [[[8704]], [[9893, 8606]], [[8522]], [[8333]], [[8283]], [[8284]], [[8523, 8607, 9894, 8609, 8705, 8706, 8745, 8746, 8599, 8695, 8696, 8826, 8827, 8759, -8876, 8761, 8738, 8739, 8741, 8742, 8735, 8736, 8732, 8743, 8744, -8681, 8578, -8484, 8482, -8322, -8321, 8292, -8195, 8156, 8110, -8062, 8017, -7872, 7845, -7700, -7699, 7573, -7494, -7493, 7419, -7206, 7170, 7167, -7028, 6997, 6993, -6975, -6806, -6721, -6720, -6719, -6795, -6794, -6828, -6827, -6823, -6822, -6886, -6885, -6884, -6802, -6673, -6924, -6923, -6922, -6921, -6920, -7061, -7060, -7256, 7339, -7438, -7437, -7484, -7483, -7542, -7541, -7711, 7821, -7868, -7867, 7891, -7899, -8057, -8056, -8055, 8285, 8280, 8336]]]
                    }, {
                        "type": "Polygon",
                        "id": 19,
                        "arcs": [[-1566, 1654, -1696, -1780, -1779, 2023, -2098, 2159, -2230, 2312, 2313, -2452, -2451, -2450, 2717, -2767, 2921, -2928, 3117, 3118, 3078, 3079, 3081, 3082, 3093, 3094, 3091, 3092, 3088, 3089, 3085, 3086, 3075, 3076, 3072, 3073, 3069, 3070, -2935, 2880, -2829, 2659, 2660, -2543, 2416, -2304, 2207, -2191, 2065, 2066, -1834, -1833, 1756, -1660, 1651, -1521, -1490, -1494, -1493, -1517, -1516, -1515, -1526, -1525, -1519, -1518, -1497, -1496, -1502, -1501, -1500, -1513, -1512, -1505, -1504]]
                    }, {
                        "type": "Polygon",
                        "id": 16,
                        "arcs": [[20, -36, 111, -202, 240, -350, -329, -328, 518, -528, -737, -736, -735, -758, -652, 1121, -1174, -1173, 1592, -1734, -1733, 2052, 2141, 2107, 2108, 2021, 2022, 1896, 1580, 1581, -1263, -1262, -1261, 1091, -970, 914, -709, 522, 535, 536, -396, -395, 364, -248, -247, 114, -82, 22, 23]]
                    }, {
                        "type": "Polygon",
                        "id": 17,
                        "arcs": [[-1968, -1967, -1948, -1947, -1953, -1952, -1960, -1959, -2030, -2029, 2116, 2233, 2234, 2235, 2510, -2533, 2774, -2825, 2957, -3156, 3323, 3324, -3546, 3727, -3919, 4027, -4173, 4238, -4445, -4444, 4683, -4705, 4905, -4930, 5135, -5171, 5358, 5359, 5361, -5492, 5562, 5574, 5575, 5568, 5569, 5570, -5351, -5350, -5160, 5125, 4935, 4936, 4726, 4727, -4456, -4455, -4521, 4379, 4380, 4381, 4165, 4070, 4071, -3929, 3750, 3751, -3685, 3515, -3493, 3241, 3242, -3118, 2927, -2922, 2766, -2718, 2449, 2450, 2451, -2314, -2313, 2229, -2160, 2097, -2024, -1778]]
                    }, {
                        "type": "Polygon",
                        "id": 18,
                        "arcs": [[-2297, -2296, -2291, -2290, -2295, 2470, -2539, 2621, -2717, 2793, 2794, -3019, 3039, -3168, 3291, -3407, -3406, 3614, -3716, 3808, -3932, -4139, 4144, -4266, -4265, 4422, 4423, 4432, 4433, -4557, 4659, 4660, 4805, 4798, 4799, 4800, 4795, 4892, 4893, 4894, 4953, 4954, 4923, 4924, 4973, 4974, 4927, 4928, 4929, -4906, 4704, -4684, 4443, 4444, -4239, 4172, -4028, 3918, -3728, 3545, -3325, -3324, 3155, -2958, 2824, -2775, 2532, -2511, -2236, 2533, 2535, 2467, -2204, -2203, -2300, -2299]]
                    }, {
                        "type": "Polygon",
                        "id": 20,
                        "arcs": [[-3419, -3431, -3429, -3428, -3423, -3422, -3433, -3432, -3413, -3412, -3410, -3409, -3417, -3416, -3426, -3427, -3317, -3316, -3486, -3485, -3490, -3489, -3488, -3492, -3561, 3664, -3762, 3884, -4003, -4002, -4046, -4199, -4198, 4346, -4501, 4546, -4772, 4820, -5042, -5041, 5300, 5301, -5544, 5556, 5557, 5558, 5531, 5532, 5523, 5524, 5592, 5593, 5446, 5447, 5449, 5450, 5526, 5527, 5459, 5460, 5528, 5529, 5456, 5457, 5453, 5520, 5521, 5519, 5516, 5517, -5318, 5244, -4880, -4879, 4590, 4591, -4355, 4276, -3941, -3940, 3619, -3365, -3420]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 21,
                        "arcs": [[[-4137, -4136, -4161, -4160, -4159, -4182, -4181, -4351, -4350, -4373, -4372, -4498, -4497, 4744, -4805, -4804, -5103, -5102, 5233, 5234, 5235, 5611, -5643, 5726, 5826, 5827, 5819, 5820, 5824, 5825, 5807, 5808, 5882, 5883, 5835, 5913, 5914, 5838, 5839, 5891, 5892, 5696, 5698, 5699, 5658, 5659, 5737, 5937, 5938, 5831, 5832, 5932, 5933, 5957, 5958, -5897, -5709, -5708, -5707, 5632, -5569, -5576, -5575, -5563, 5491, -5362, -5360, -5359, 5170, -5136, -4929, -4928, -4975, -4974, -4925, -4924, -4955, -4954, -4895, -4894, -4893, -4796, -4801, -4800, -4799, -4806, -4661, -4660, 4556, -4434, -4433, -4424, -4423, 4264, 4265, -4145, -4138]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 22,
                        "arcs": [[[9108]], [[9088]], [[9046]], [[9028]], [[9899, 9025, 9089, 9003, 9084, 9900, 9078, 9901, 9080, 9902, 9082, 9109, 9070, 9049, 9037, 9060, -9017, -8995, 8942, -8693, -8692, 8649, 8456, 8457, -8406, 8237, -8223, 7906, 7907, 7908, -7820, -7645, -7644, -7721, -7720, -7735, -7734, -7796, -7795, -7778, -7667, -7666, -7665, -7928, 7943, -8109, -8108, -8107, -8106, 8274, 8275, 8276, 8491, 8492, -8647, -8646, -8661, -8660, -8659, -8664, -8663, -8665, -8632, -8771, -8770, 8846, 8847, 9010, 9027]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 25,
                        "arcs": [[[2727]], [[2632]], [[2175, 2248, 2249, 2250, 2251, 2252, 2168, 2015, 2016, 2017, 2169, 2170, 2171, 1997, 1998, 1999, -1887, -1737, -1736, -1754, -1807, -1806, -1783, -1782, -1781, -1749, 1934, 9903, 2006, 9904, 2008, 2118, 2165, 2177, 9905, 2173, 2287]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 24,
                        "arcs": [[[4166]], [[4781, 4782, 4856, 4857, 4858, 4690, 4581, 4268, 4408, 4169, 4080, 3824, 3834, 3840, 4088, 4192, 9906, 4194, 4521, 4293, 4613, 4731, 4615, 4295, 4296, 4114, 4115, 4116, 3849, 3811, 3812, 3813, 3814, 3816, 3817, 3818, 3820, 3821, 3822, -3547, -3461, -3460, -3445, -3537, -3536, -3458, -3457, -3584, -3583, -3501, -3500, -3499, -3449, -3448, -3498, -3756, -3755, 4078, -4102, -4101, 4266, -4398, -4397, -4396, 4784]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 23,
                        "arcs": [[[918]], [[919]], [[1288, 1134, 1392, 1380, 1390, 1382, 1537, 1538, -1300, -889, 889, 890, 891, 817, 567, 360, 813, 920, 599, 1117, 1282, 1286, 1391]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 26,
                        "arcs": [[[9402]], [[9401]], [[771, 820, 9406, 1075, 1236, 9407, 1434, 1560, 1561, 9408, 1578, 9409, 1927, 9410, 9412, -2505, 2280, 2281, 2292, 2293, 2294, 2289, 2290, 2295, 2296, 2298, 2299, 2202, 2203, 2204, 2151, 1988, 1785, 1686, 1533, 1378, 1225, 1112, 9404, 9405, 948, 9400, 9399]], [[9395]], [[9388, 9389]], [[9390]], [[9377, 446, 9382, 9384, 491, 9394, 9907, 9392, 9396, 9397, 574, 9385, 712, 713, 714, 639, 640, 587, 588, 589, 590, 476, 477, 478, 479, 480, 481, 482, 483, 484, 434, 9378]], [[9373, 9379, 9375]], [[9376]]]
                    }, {
                        "type": "Polygon",
                        "id": 27,
                        "arcs": [[125, 151, 204, 9366, 9365, 203, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 473, 592, 593, 594, -667, 794, -800, 901, 902, 1050, -1075, 1139, -1162, -1187, -1186, -1191, 1370, -1423, 1502, 1503, 1504, 1511, 1512, 1499, 1500, 1501, 1495, 1496, 1517, 1518, 1524, 1525, 1514, 1515, 1516, 1492, 1493, 1489, 1490, 1336, -1220, 1179, -1044, -1043, 917, -893, 840, -746, 702, -551, 546, 415, -404, 348, -318, 218, -210, 164, 165, -55, 60, 106, 9364]]
                    }, {
                        "type": "Polygon",
                        "id": 29,
                        "arcs": [[-3119, -3243, -3242, 3492, -3516, 3684, -3752, -3751, 3928, -4072, -4071, -4166, -4382, -4381, -4380, 4520, 4454, 4455, -4728, -4727, -4937, -4936, -5126, 5159, 5349, 5350, -5571, -5570, -5633, 5706, 5707, 5708, 5896, 5897, 5898, 5899, -6100, 6161, 6162, 5968, 5969, 5970, 5971, 5972, 5865, 5915, 5916, 5885, 5886, 5887, 5715, 5929, 5930, 5931, 5918, 5919, 5920, 5815, 5841, 5842, 5935, 5936, -5766, 5719, -5557, 5543, -5302, -5301, 5040, 5041, -4821, 4771, -4547, 4500, -4347, 4197, 4198, 4045, 4001, 4002, -3885, 3761, -3665, 3560, 3491, -3487, -3304, 3273, -3129, -3070, -3074, -3073, -3077, -3076, -3087, -3086, -3090, -3089, -3093, -3092, -3095, -3094, -3083, -3082, -3080, -3079]]
                    }, {
                        "type": "Polygon",
                        "id": 28,
                        "arcs": [[-6755, -6754, -6938, 6953, 6950, -7180, 7256, -7303, 7420, -7449, 7598, -7679, 7825, -7956, -7955, 8127, -8251, -8250, 8435, -8522, 8619, -8704, -8703, 8838, 8861, 8880, -8847, 8769, 8770, 8631, 8664, 8662, 8663, 8658, 8659, 8660, 8645, 8646, -8493, -8492, -8277, -8276, -8275, 8105, 8106, 8107, 8108, -7944, 7927, -7664, -7663, 7413, 7414, -7134, -7133, 7026, -7016, -6737, -6736, -6768, -6767, -6772, -6771, -6743, -6742, -6741, -6773]]
                    }, {
                        "type": "Polygon",
                        "id": 30,
                        "arcs": [[43, 99, 88, 46, 50, 29, 9, 53, 110, -93, 108, -133, 221, -231, 373, -381, 514, 515, 516, 675, 676, 677, 763, 764, 765, 697, 698, 826, 827, 655, 649, 650, 651, 757, 734, 735, 736, 527, -519, 327, 328, 349, -241, 201, -112, 35, -21, 36, 19]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 37,
                        "arcs": [[[-5845, 6042, 6259, 6044]], [[6047, 6086, 6179, 6194, 6038, 6056, 6247, 6431, 6425, 6582, 6258, 6583, 6564, 6492, 6560, 6804, 6761, 6831, 6759, 6893, 6990, 7112, 7271, 9920, 7273, 7279, 7280, 7281, 7282, 7252, 7005, 7006, 7007, 6928, 6877, 6846, 6847, 6852, 6853, 6676, 6677, 6756, 6645, 6646, 6630, 6631, 6768, 6769, 6695, 6749, 6750, 6751, 6671, 6672, 6801, 6883, 6884, 6885, 6821, 6822, 6823, -6595, -6594, -6457, -6456, -6392, -6391, -6287, -6286, -6285, 6174, -6175, -6174, -6233, -6232, -6231, -6084, -6083, -5987, -5986, -5985, -5928, -5927, -5926, -5854, -5896, -5895, -5911, -5910, -5674, -5673, -5963, -5671, -5714, -5713, -5712, -5882, -5881, -5880, -5725, -5724, -5876, -5805, -5804, -5803, -5871, -5870, -5908, -5907, -5849, 6041]]]
                    }, {
                        "type": "Polygon",
                        "id": 38,
                        "arcs": [[54, -166, -165, 209, -219, 317, -349, 403, -416, -547, 550, 551, 627, 628, 633, 634, 631, 632, 530, 583, 623, 624, 625, 635, -516, -515, 380, -374, 230, -222, 132, -109, 92, 93, 98, 103, 40, 32, 64, 68, 57]]
                    }, {
                        "type": "Polygon",
                        "id": 31,
                        "arcs": [[-1710, -1552, -1682, -1681, -1672, -1671, -1812, -1810, -1809, -1839, -1838, -1836, -1835, -2067, -2066, 2190, -2208, 2303, -2417, 2542, -2661, -2660, 2828, -2881, 2934, -3071, 3128, -3274, 3303, 3486, 3487, 3488, 3489, 3484, 3485, 3315, 3316, 3426, 3425, 3415, 3416, 3408, 3409, 3411, 3412, 3431, 3432, 3421, 3422, 3427, 3428, 3430, 3418, 3419, -3364, 3193, -3140, 2970, 2971, 2822, 2700, 2701, 2731, 2732, -2551, 2541, -2048, -2047, 1861, -1644, -1684, -1683, -1574, -1573, -1709]]
                    }, {
                        "type": "Polygon",
                        "id": 33,
                        "arcs": [[-890, 888, 1299, -1539, 1615, 1747, 1748, 1780, 1781, 1782, 1805, 1806, -1753, 1614, -1456, 1269, 1270, -1115, -996, 899, 900, -891]]
                    }, {
                        "type": "Polygon",
                        "id": 34,
                        "arcs": [[9921, 3944, 3785, 3786, 3787, 3788, 3789, 3726, 3668, 3524, 3525, -3254, -3253, 3124, 2911, 2912, -2814, 2756, -2603, -2568, -2567, -2770, -2769, 2897, 3116, 3066, 3156, 3256, 3346, 3531, 3521, 3805, 4124, 3946]]
                    }, {
                        "type": "Polygon",
                        "id": 35,
                        "arcs": [[5784, 5785, 5786, -6372, 6554, 6555, -6863, 7008, 7009, 7156, 7157, -7563, 7653, 7654, 7655, 7656, 7657, 7967, 7968, 7969, 7783, 7784, 7785, 7888, 7889, 8111, 8037, 8038, -7593, -7592, 7176, -5782, -5781, -5780, 5778, -5322, -5324, -5498, -5497, -5512, -5511, -5309, -5308, -5209, -5208, -5320]]
                    }, {
                        "type": "Polygon",
                        "id": 32,
                        "arcs": [[-2023, -2357, 2361, -2921, 3561, 3562, -3998, 4621, 4622, 4623, 4624, 5911, 5912, -5467, 4254, 4772, -4569, 4323, 3801, 4307, 4308, 4309, -4131, -4130, 2391, 2392, 2393, 2394, -2384, -1603, -1429, -1428, -1264, -1582, -1581, -1897]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 36,
                        "arcs": [[[3237]], [[3052, 9922, 3054, 3119, 3152, 3121, 3056, 2782]], [[1826]], [[3046, 3097, 3048, 2751, 2629, 2770, 2768, 2769, 2566, 2567, 2568, 2324, 2325, 2093, 2153, 2154, 2156, 2157, 2188, 2189, 2056, 2057, 2088, 2089, 2085, 2086, 2060, 2061, 2062, 1831, 1716, 1713, 1721, 1724, 1701, 1570, 1279, 9923, 1281, 1275, 1276, 1019, 1031, 1005, -1001, 1002, -1132, 1204, -1296, -1485, 1544, -1738, 1886, -2000, -1999, 2283, 2284, -2550, -2549, 2752]]]
                    }, {
                        "type": "Polygon",
                        "id": 39,
                        "arcs": [[2397, -2447, 2666, -2675, 2898, -2906, 3033, 3034, -3246, 3262, 3263, -3520, 3528, -3609, 3737, 3738, 3893, 3894, 3895, 3992, -4069, 4228, 4226, 4362, 4363, 4494, 4495, 4496, 4497, 4371, 4372, 4349, 4350, 4180, 4181, 4158, 4159, 4160, 4135, 4136, 4137, 4138, 3931, -3809, 3715, -3615, 3405, 3406, -3292, 3167, -3040, 3018, -2795, -2794, 2716, -2622, 2538, -2471, -2294, -2293, -2282, -2281, 2504, 2505, 2506, 2507, 2508, 2509, 2514, 9926, 2516, 2669, 2593, 2594, 2595, 2636, 2579, 2443, 2401, -2200]]
                    }, {
                        "type": "Polygon",
                        "id": 40,
                        "arcs": [[-5458, -5457, -5530, -5529, -5461, -5460, -5528, -5527, -5451, -5450, -5448, -5447, -5594, -5593, -5525, -5524, -5533, -5532, -5559, -5558, -5720, 5765, -5937, 5945, -6118, -6257, 6315, -6551, 6610, -6728, 6773, 6774, -7119, 7231, 7232, 7233, 7234, 7401, 7402, 7398, 7399, 7400, 7380, 7440, 7441, 7442, 7337, 7338, 7229, 7230, 7139, 7140, 7035, 7036, 6930, 6931, -6871, 6691, -6627, 6398, -6366, 6016, 6017, 5798, 5799, 5794, 5795, 5796, 5791, 5792, -5785, -5319, -5518, -5517, -5520, -5522, -5521, -5454]]
                    }, {
                        "type": "Polygon",
                        "id": 41,
                        "arcs": [[661, -608, 658, -691, -604, -603, -696, -695, -694, -693, -692, -503, -502, -557, -555, -554, -513, -583, -536, -523, 708, -915, 969, -1092, 1260, 1261, 1262, 1263, 1427, 1428, 1602, 1603, 1599, 1600, 1881, 1973, 1974, 1892, 1893, 1611, 1464, 1298, 980, 776, 622]]
                    }, {
                        "type": "Polygon",
                        "id": 42,
                        "arcs": [[-2061, -2087, -2086, -2090, -2089, -2058, -2057, -2190, -2189, -2158, -2157, -2155, -2154, -2094, -2326, -2325, -2569, 2602, -2757, 2813, -2913, -2912, -3125, 3252, 3253, -3526, 3553, 3584, 3585, -3757, 3587, 3496, 3497, 3447, 3448, 3498, 3499, 3500, 3582, 3583, 3456, 3457, 3535, 3536, 3444, 3459, 3460, 3546, 3547, 3548, 3610, 3611, -3610, 3337, 3338, 3339, -3244, 3106, -3034, 2905, -2899, 2674, -2667, 2446, -2398, 2199, 2200, -2062]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 44,
                        "arcs": [[[2544]], [[2545, -2250]], [[-2253, -2252, 2452, 2321, 2454, 2553, -2527, 2456, -2319, -2318, -2016, -2169]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 45,
                        "arcs": [[[8077]], [[8079]], [[8080]], [[7693, 9413, 9930, 9415, 7862, 8081, 8046, 9931, 8048, 9932, 8050, 8078, 8053, 8054, 8055, 8056, 7898, -7892, 7866, 7867, -7822, 7710, 7540, 7541, 7482, 7483, 7436, 7437, -7340, 7255, 7059, 7060, 6919, 6920, 6921, 6922, 6923, -6672, -6752, -6751, -6750, -6696, -6770, -6769, -6632, -6631, -6647, -6646, -6757, -6678, -6677, -6854, -6853, -6848, -6847, -6878, -6929, -7008, -7007, -7006, -7253, -7283, 7328, 7588, 9416]]]
                    }, {
                        "type": "Polygon",
                        "id": 46,
                        "arcs": [[-624, -584, -531, -633, -632, -635, -634, -629, -628, -552, -703, 745, -841, 892, -918, 1042, 1043, -1180, 1219, -1337, -1491, 1520, -1652, 1659, -1757, 1832, 1833, 1834, 1835, 1837, 1838, 1808, 1809, 1811, 1670, 1671, 1680, 1681, 1551, 1709, 1708, 1572, 1573, 1682, 1683, -1643, 1487, -1374, 1248, 1183, -1033, 939, -677, -676, -517, -636, -626, -625]]
                    }, {
                        "type": "Polygon",
                        "id": 47,
                        "arcs": [[-5660, -5659, -5700, -5699, -5697, -5893, -5892, -5840, -5839, -5915, -5914, -5836, -5884, -5883, -5809, -5808, -5826, -5825, -5821, -5820, -5828, -5879, -5878, -5891, -5890, -5889, -5859, -5983, -5863, -5862, -5929, 5984, 5985, 5986, 6082, 6083, 6230, 6231, 6232, 6173, 6174, -6175, 6284, 6285, 6286, 6390, 6391, 6455, 6456, 6593, 6594, -6824, 6826, 6827, 6793, 6794, 6718, 6719, 6720, 6805, 6806, 6790, 6791, 6784, 6785, 6723, 6724, 6713, 6698, 6752, 6753, 6754, 6772, 6740, 6741, 6742, 6770, 6771, 6766, 6767, -6735, 6604, -6410, -6409, -6408, -6407, 6273, -6162, 6099, -5900, -6101, -5898, -5959, -5958, -5934, -5933, -5833, -5832, -5939, -5938, -5738]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 48,
                        "arcs": [[[9933]], [[9311, 9312]], [[9313, 9290, 9934, 9292, 9314]], [[9271]], [[9242]], [[9935, 9214]], [[9128]], [[9132, 9175, 9936, 9164, 9217, 9166, 9937, 9168, 9179, 9216, 9227, 9247, 9938, 9249, 9229, 9243, 9254, 9246, 9255, 9939, 9257, 9273, 9293, 9318, 9347, 9352, 9345, 9342, 9310, 9253, 9190, 9127, 8977, 8872, 8869, 8883, 8392, 8394, -7889, -7786, -7785, -7784, -7970, -7969, -7968, -7658, -7657, -7656, -7655, -7654, 7562, -7158, -7157, -7010, -7009, 6862, -6556, -6555, 6371, -5787, -5786, -5793, -5792, -5797, -5796, -5795, -5800, -5799, -6018, -6017, 6365, -6399, 6626, -6692, 6870, -6932, -6931, -7037, -7036, -7141, -7140, -7231, -7230, -7339, -7338, -7443, -7442, -7441, -7381, -7401, -7400, -7399, -7403, -7402, -7235, -7234, -7514, 7610, -7646, 7819, -7909, -7908, -7907, 8222, -8238, 8405, -8458, -8457, -8650, 8691, 8692, -8943, 8994, 9016, 9017, 9090, 9131, 9092, 9020, 9130]]]
                    }, {
                        "type": "Polygon",
                        "id": 49,
                        "arcs": [[-1732, 2343, -2621, -2196, -2195, -2983, -2982, 3098, 3099, -3578, 4025, -4629, 4748, 4749, 4750, 4751, 4752, 4753, 5415, 5416, 5342, -4624, -4623, -4622, 3997, -3563, -3562, 2920, -2362, 2356, -2022, -2109, -2108, -2142, -2053]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 51,
                        "arcs": [[[5405, 5058, -4782, 5059]], [[5005, 4865, 4807, 4982, 5225, 5370, 5424, 5372, 5109, 5148, 5330, 5473, 5536, 9940, 5683, 5638, 5472, 5431, 5282, 5394, 9941, 5581, 5626, 5665, 5871, 9942, 5902, 9943, 9944, 5905, 5850, 5823, 5851, 5844, 5845, 5846, 5847, 5848, 5906, 5907, 5869, 5870, 5802, 5803, 5804, 5875, 5723, 5724, 5879, 5880, 5881, 5711, 5712, 5713, 5670, 5962, 5672, 5673, 5909, 5910, 5894, 5895, 5853, 5925, 5926, 5927, 5928, 5861, 5862, 5982, 5858, 5888, 5889, 5890, 5877, 5878, -5827, -5727, 5642, -5612, -5236, -5235, -5234, -5101, -5412, -5411, -5378, -5377, -5376, -5180, -5275, -5274, 5122, -4883, 4877, -4536, -4535, -4403, -4402, -4401, -4189, -4188, 4043, -3999, -3865, -3910, -4025, -4024, -3812, -3850, -4117, -4116, -4387, 4417, 9945, 4342, 4409, 4669, 4810, 4866, 5063, 5188]]]
                    }, {
                        "type": "Polygon",
                        "id": 50,
                        "arcs": [[1008, 998, -900, 995, 1114, -1271, -1270, 1455, -1615, 1752, 1753, 1735, 1736, 1737, -1545, 1484, 1295, -1205, 1131, -1003, 1000, 1001, 994]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 53,
                        "arcs": [[[303]], [[271]], [[184]], [[118]], [[119]], [[120]], [[126, 2, 3, 75, 85, 80, 83, -23, 81, -115, 246, 247, -365, 394, 395, -537, 582, 512, 553, 554, 556, 501, 502, 691, 692, 693, 694, 695, 602, 603, 690, -659, 607, 608, 610, 467, 343, 233, 186, 187, 234, 319, 276, 371, 273, 372, 321, 407, 370, 307, 196, 183, 197, 129]]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 55,
                        "arcs": [[[9372]], [[9371, 561, 557, -484, -483, -482, -481, -480, -479, -478, -477, -591, -590, -589, -588, -641, -640, -715, 9386, 879, 9949, 881, 1155, 1167, 9387, 1165, 1289, 1474, 1623, 1800, 1960, 2027, 2028, 2029, 1958, 1959, 1951, 1952, 1946, 1947, 1966, 1967, 1777, 1778, 1779, 1695, -1655, 1565, -1503, 1422, -1371, 1190, 1185, 1186, 1161, -1140, 1074, -1051, -903, -902, 799, -795, 666, -595, -594, -593, -474, -148, 9368, 9370]]]
                    }, {
                        "type": "Polygon",
                        "id": 54,
                        "arcs": [[3243, -3340, -3339, -3338, 3609, -3612, -3611, -3549, -3548, -3823, -3822, -3821, -3819, -3818, -3817, -3815, -3814, -3813, 4023, 4024, 3909, 3864, 3998, -4044, 4187, 4188, 4400, 4401, 4402, 4534, 4535, -4878, 4882, -5123, 5273, 5274, 5179, 5375, 5376, 5377, 5410, 5411, 5100, 5101, 5102, 4803, 4804, -4745, -4496, -4495, -4364, -4363, -4227, -4229, 4068, -3993, -3896, -3895, -3894, -3739, -3738, 3608, -3529, 3519, -3264, -3263, 3245, -3035, -3107]]
                    }, {
                        "type": "Polygon",
                        "id": 56,
                        "arcs": [[-827, -699, -698, -766, -765, -764, -678, -940, 1032, -1184, -1249, 1373, -1488, 1642, 1643, -1862, 2046, 2047, -2542, 2550, 2551, 2552, 2139, 2140, 2134, 2135, 2136, 2193, 2194, 2195, 2620, -2344, 1731, 1732, 1733, -1593, 1172, 1173, -1122, -651, -650, -656, -828]]
                    }, {
                        "type": "MultiPolygon",
                        "id": 78,
                        "arcs": [[[9867]], [[9840]]]
                    }]
                },
                land: {
                    "type": "MultiPolygon",
                    "arcs": [[[9361]], [[9933]], [[9338]], [[9311, 9312]], [[9313, 9290, 9934, 9292, 9314]], [[9271]], [[9242]], [[9935, 9214]], [[9128]], [[9108]], [[9088]], [[9046]], [[9063]], [[9882, 9883]], [[9028]], [[8993, 8905]], [[8704]], [[9893, 8606]], [[8522]], [[8333]], [[8283]], [[8284]], [[8077]], [[8079]], [[8080]], [[7053]], [[7019]], [[7054]], [[6896]], [[6897]], [[4166]], [[3237]], [[3052, 9922, 3054, 3119, 3152, 3121, 3056, 2782]], [[2727]], [[2632]], [[2544]], [[1826]], [[918]], [[919]], [[9402]], [[9401]], [[9395]], [[9388, 9389]], [[9390]], [[9372]], [[9373, 9379, 9375]], [[-9918]], [[1275, 1276, 1019, 1031, 1005, 1001, 994, 1008, 998, 900, 891, 817, 567, 360, 813, 920, 599, 1117, 1282, 1286, 1391, 1288, 1134, 1392, 1380, 1390, 1382, 1537, 1615, 1747, 1934, 9903, 2006, 9904, 2008, 2118, 2165, 2177, 9905, 2173, 2287, 2175, 2248, 2545, 2250, 2452, 2321, 2454, 2553, 2527, 2557, 2559, 9881, 2561, 2547, 2752, 3046, 3097, 3048, 2751, 2629, 2770, 2897, 3116, 3066, 3156, 3256, 3346, 3531, 3521, 3805, 4124, 3946, 9921, 3944, 3785, 9954, 3787, 9955, 3789, 3726, 3668, 3524, 3553, 3584, 3752, 4102, 4392, 9956, 4394, 4784, 5059, 5405, 5058, 4782, 4856, 9957, 4858, 4690, 4581, 4268, 4408, 4169, 4080, 3824, 3834, 3840, 4088, 4192, 9906, 4194, 4521, 4293, 4613, 4731, 4615, 4295, 4385, 4417, 9945, 4342, 4409, 4669, 4810, 4866, 5063, 5188, 5005, 4865, 4807, 4982, 5225, 5370, 5424, 5372, 5109, 5148, 5330, 5473, 5536, 9940, 5683, 5638, 5472, 5431, 5282, 5394, 9941, 5581, 5626, 5665, 5871, 9942, 5902, 9943, 9944, 5905, 5850, 5823, 5851, 6042, 6259, 6044, 5845, 9958, 9959, 9960, 5847, 6041, 6047, 6086, 6179, 6194, 6038, 6056, 6247, 6431, 6425, 6582, 6258, 6583, 6564, 6492, 6560, 6804, 6761, 6831, 6759, 6893, 6990, 7112, 7271, 9920, 7273, 7279, 9961, 7281, 7328, 7588, 9416, 7693, 9413, 9930, 9415, 7862, 8081, 8046, 9931, 8048, 9932, 8050, 8078, 8053, 8285, 8280, 8336, 8523, 8607, 9894, 8609, 8705, 8835, 8906, 9013, 9099, 9139, 9161, 9152, 9098, 8991, 8903, 8992, 9888, 8988, 9116, 9153, 9204, 9889, 9206, 9146, 9200, 9276, 9296, 9890, 9298, 9326, 9891, 9322, 9892, 9324, 9332, 9353, 9360, 9884, 9356, 9885, 9358, 9362, 9351, 9340, 9331, 9302, 9329, 9304, 9285, 9264, 9262, 9235, 9221, 9193, 9886, 9137, 9363, 8968, 8865, 8969, 9065, 9006, 9064, 9008, 8913, 9009, 8915, 8804, 9887, 8806, 8797, 8790, 8787, 8676, 9880, 8678, 8701, 8838, 8861, 8880, 8847, 9010, 9027, 9899, 9025, 9089, 9003, 9084, 9900, 9078, 9901, 9080, 9902, 9082, 9109, 9070, 9049, 9037, 9060, 9017, 9090, 9131, 9092, 9020, 9130, 9132, 9175, 9936, 9164, 9217, 9166, 9937, 9168, 9179, 9216, 9227, 9247, 9938, 9249, 9229, 9243, 9254, 9246, 9255, 9939, 9257, 9273, 9293, 9318, 9347, 9352, 9345, 9342, 9310, 9253, 9190, 9127, 8977, 8872, 8869, 8883, 8392, 8394, 7889, 8111, 8037, 8208, 8504, 8191, 7725, 7740, 7697, 7519, 7056, 7020, 6899, 6528, 5874, 5606, 5291, 5193, 5288, 5438, 5155, 5018, 4853, 4552, 4697, 4472, 4696, 4474, 4482, 4847, 4484, 3626, 2685, 2373, 1893, 1611, 1464, 1298, 980, 776, 622, 661, 608, 610, 467, 343, 233, 186, 9946, 9962, 9948, 3, 75, 85, 80, 83, 23, 36, 19, 43, 99, 88, 46, 50, 29, 9, 53, 110, 93, 98, 103, 40, 32, 64, 68, 57, 60, 106, 9364, 125, 151, 204, 9366, 9365, 203, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 9368, 9370, 9371, 561, 557, 484, 434, 9378, 9377, 446, 9382, 9384, 491, 9394, 9907, 9392, 9396, 9397, 574, 9385, 712, 713, 9386, 879, 9949, 881, 1155, 1167, 9387, 1165, 1289, 1474, 1623, 1800, 1960, 2027, 2116, 2233, 2234, 2533, 2535, 2467, 2204, 2151, 1988, 1785, 1686, 1533, 1378, 1225, 1112, 9404, 9405, 948, 9400, 9399, 771, 820, 9406, 1075, 1236, 9407, 1434, 1560, 1561, 9408, 1578, 9409, 1927, 9410, 9412, 2505, -9912, 2507, -9910, 2509, 2514, 9926, 2516, 2669, 2593, 2594, 2595, 2636, 2579, 2443, 2401, 2200, 2062, 1831, 1716, 1713, 1721, 1724, 1701, 1570, 1279, 9923, 1281]], [[9612, 9619, 9600, 9610, 9536, 9547, 9542, 9545, 9501, 9528, 9516, 9644, 9518, 9525, 9874, 9527, 9503, 9875, 9505, 9543, 9508, 9544, 9540, 9546, 9538, 9611, 9602, 9606, 9596, 9607, 9591, 9608, 9581, 9571, 9609, 9872, 9493, 9479, 9465, 9873, 9463, 9480, 9468, 9481, 9475, 9567, 9471, 9568, 9559, 9628, 9624, 9622]], [[9489]], [[9626]], [[9552, 9521, 9870, 9523, 9551, 9533]], [[9561]], [[9499, 9529, 9871, 9531, 9497, 9534]], [[9869, 9550]], [[9455]], [[9515]], [[9447]], [[9563]], [[9514]], [[9491]], [[9445]], [[9555]], [[9554]], [[9440]], [[9586]], [[9510]], [[9444]], [[9434]], [[9513]], [[9512]], [[9588]], [[9511]], [[9431]], [[9548]], [[9642]], [[9460]], [[9438]], [[9562]], [[9432]], [[9470]], [[9451]], [[9589]], [[9487]], [[9458]], [[9426]], [[9553]], [[9437]], [[9524]], [[9492]], [[9500]], [[9441]], [[9435]], [[9490]], [[9592]], [[9439]], [[9625]], [[9486]], [[9485]], [[9488]], [[9442]], [[9452]], [[9443]], [[9597]], [[9454]], [[9436]], [[9453]], [[9585]], [[9483]], [[9449]], [[9428]], [[9456]], [[9446]], [[9620]], [[9603]], [[9459]], [[9448]], [[9457]], [[9450]], [[9594]], [[9583]], [[9584]], [[9582]], [[9476]], [[9587]], [[9605]], [[9604]], [[9484]], [[9627]], [[9461]], [[9560]], [[9429]], [[9427]], [[9433]], [[9593]], [[9430]], [[9629]], [[9630]], [[9631]], [[9632]], [[9633]], [[9634]], [[9466]], [[9635]], [[9636]], [[9637]], [[9638]], [[9639]], [[9640]], [[9509]], [[9467]], [[9641]], [[9643]], [[9867]], [[9866]], [[9840]], [[9813, 9697, 9666, 9723, 9817, 9718, 9726, 9759, 9868, 9839, 9877, 9737, 9820, 9731, 9847, 9853, 9844, 9863, 9864, 9855, 9865, 9834, 9848, 9782, 9878, 9822, 9803, 9689, 9746, 9830, 9705, 9790, 9823, 9668, 9768, 9779, 9660, 9761, 9879, 9654, 9788, 9832]], [[9417]], [[9422]], [[9421]], [[9423]], [[9876, 9420]], [[9424]], [[9425]], [[9418]]]
                }
            },
            "transform": {
                "scale": [0.00035892617892657177, 0.00005371486851395936],
                "translate": [-179.1473400003406, 17.67439566600018]
            }
        }
    };
}));

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/ChoroplethStates',["d3", "topojson", "./Choropleth", "./us-states"], factory);
    } else {
        root.map_ChoroplethStates = factory(root.d3, root.topojson, root.map_Choropleth, root.map_usStates);
    }
}(this, function (d3, topojson, Choropleth, usStates) {
    var features = topojson.feature(usStates.topology, usStates.topology.objects.states).features;
    var rFeatures = {};
    for (var key in features) {
        if (features[key].id) {
            rFeatures[usStates.stateNames[features[key].id].code] = features[key];
        }
    }
    function ChoroplethStates() {
        Choropleth.call(this);

        this.projection("albersUsaPr");

        this._choroTopology = usStates.topology;
        this._choroTopologyObjects = usStates.topology.objects.states;
    }
    ChoroplethStates.prototype = Object.create(Choropleth.prototype);
    ChoroplethStates.prototype.constructor = ChoroplethStates;
    ChoroplethStates.prototype._class += " map_ChoroplethStates";

    ChoroplethStates.prototype.layerEnter = function (base, svgElement, domElement) {
        Choropleth.prototype.layerEnter.apply(this, arguments);

        this._selection.widgetElement(this._choroplethData);
        this.choroPaths = d3.select(null);
        var context = this;
        this
            .tooltipHTML(function (d) {
                var code = rFeatures[d[0]].id;
                return context.tooltipFormat({ label: usStates.stateNames[code].name, value: d[1] });
            })
        ;
    };

    ChoroplethStates.prototype.layerUpdate = function (base) {
        Choropleth.prototype.layerUpdate.apply(this, arguments);

        this.choroPaths = this._choroplethData.selectAll(".data").data(this.visible() ? this.data() : [], function (d) { return d[0]; });
        var context = this;
        this.choroPaths.enter().append("path")
            .attr("class", "data")
            .call(this._selection.enter.bind(this._selection))
            .on("click", function (d) {
                context.click(context.rowToObj(d), "weight", context._selection.selected(this));
            })
            .on("dblclick", function (d) {
                context.dblclick(context.rowToObj(d), "weight", context._selection.selected(this));
            })
            .on("mouseout.tooltip", this.tooltip.hide)
            .on("mousemove.tooltip", this.tooltip.show)
        ;
        this.choroPaths
            .attr("d", function (d) {
                var retVal = base._d3GeoPath(rFeatures[d[0]]);
                if (!retVal) {
                    console.log("Unknown US State:  " + d);
                }
                return retVal;
            })
            .style("fill", function (d) {
                var retVal = context._palette(d[1], context._dataMinWeight, context._dataMaxWeight);
                return retVal;
            })
        ;
        this.choroPaths.exit().remove();
    };

    return ChoroplethStates;
}));

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/ChoroplethStatesHeat.js',["../layout/Layered"], factory);
    } else {
        root.map_ChoroplethStatesHeat = factory(root.layout_Layered);
    }
}(this, function (Layered) {
    function ChoroplethStatesHeat(target) {
        Layered.call(this);
    }
    ChoroplethStatesHeat.prototype = Object.create(Layered.prototype);
    ChoroplethStatesHeat.prototype.constructor = ChoroplethStatesHeat;
    ChoroplethStatesHeat.prototype._class += " map_ChoroplethStatesHeat";

    return ChoroplethStatesHeat;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/GeoHash.js',["d3", "topojson", "./Layer", "./Utility", "../common/Palette", "../common/Utility", "css!./GeoHash"], factory);
    } else {
        root.map_GeoHash = factory(root.d3, root.topojson, root.map_Layer, root.map_Utility, root.common_Palette, root.common_Utility);
    }
}(this, function (d3, topojson, Layer, Utility, Palette, CommonUtility) {
    function GeoHash() {
        Layer.call(this);
    }
    GeoHash.prototype = Object.create(Layer.prototype);
    GeoHash.prototype.constructor = GeoHash;
    GeoHash.prototype._class += " map_GeoHash";

    GeoHash.prototype._palette = Palette.rainbow("default");

    GeoHash.prototype.publish("paletteID", "YlOrRd", "set", "Palette ID", GeoHash.prototype._palette.switch(), { tags: ["Basic", "Shared"] });
    GeoHash.prototype.publish("useClonedPalette", false, "boolean", "Enable or disable using a cloned palette", null, { tags: ["Intermediate", "Shared"] });

    GeoHash.prototype.publish("opacity", 1.0, "number", "Opacity", null, { tags: ["Advanced"] });

    GeoHash.prototype.publish("meshVisible", true, "boolean", "Mesh Visibility");
    GeoHash.prototype.publish("meshColor", null, "html-color", "Stroke Color", null, { optional: true });
    GeoHash.prototype.publish("meshStrokeWidth", 0.25, "number", "Stroke Width");

    GeoHash.prototype.data = function (_) {
        var retVal = Layer.prototype.data.apply(this, arguments);
        if (arguments.length) {
            this._dataMinWeight = null;
            this._dataMaxWeight = null;

            this.data().forEach(function (item) {
                if (!this._dataMinWeight || item[1] < this._dataMinWeight) {
                    this._dataMinWeight = item[1];
                }
                if (!this._dataMaxWeight || item[1] > this._dataMaxWeight) {
                    this._dataMaxWeight = item[1];
                }
            }, this);
        }
        return retVal;
    };

    GeoHash.prototype.layerEnter = function (base, svgElement, domElement) {
        Layer.prototype.layerEnter.apply(this, arguments);

        this.geohash = new Utility.Geohash();
        this._geoHashTransform = svgElement.append("g");
        this._selection = new CommonUtility.SimpleSelection(this._geoHashTransform);
        this.geoHashPaths = d3.select(null);
    };

    GeoHash.prototype.layerUpdate = function (base) {
        Layer.prototype.layerUpdate.apply(this, arguments);

        this._palette = this._palette.switch(this.paletteID());
        if (this.useClonedPalette()) {
            this._palette = this._palette.cloneNotExists(this.paletteID() + "_" + this.id());
        }

        this._geoHashTransform.style("opacity", this.opacity());

        this.geoHashPaths = this._geoHashTransform.selectAll(".data").data(this.visible() ? this.data() : [], function (d) { return d[0]; });
        var context = this;
        this.geoHashPaths.enter().append("path")
            .attr("class", "data")
            .call(this._selection.enter.bind(this._selection))
            .on("click", function (d) {
                context.click(context.rowToObj(d), "weight", context._selection.selected(this));
            })
            .on("dblclick", function (d) {
                context.dblclick(context.rowToObj(d), "weight", context._selection.selected(this));
            })
        ;
        this.geoHashPaths
            .attr("d", function (d) {
                var pos = context.geohash.bounds(d[0]);
                var route = {
                    type: "LineString",
                    coordinates: [
                        [pos.sw.lon, pos.ne.lat],
                        [pos.ne.lon, pos.ne.lat],
                        [pos.ne.lon, pos.sw.lat],
                        [pos.sw.lon, pos.sw.lat]
                    ]
                };
                return base._d3GeoPath(route);
            })
            .style("fill", function (d) {
                var retVal = context._palette(d[1], context._dataMinWeight, context._dataMaxWeight);
                return retVal;
            })
        ;
        this.geoHashPaths.exit().remove();
    };

    GeoHash.prototype.layerZoomed = function (base) {
        Layer.prototype.layerZoomed.apply(this, arguments);
        this._geoHashTransform
            .attr("transform", "translate(" + base._zoom.translate() + ")scale(" + base._zoom.scale() + ")")
            .attr("stroke-width", 1.5 / base._zoom.scale() + "px")
        ;
    };

    //  Events  ---
    GeoHash.prototype.click = function (row, column, selected) {
        console.log("Click:  " + JSON.stringify(row) + ", " + column + ", " + selected);
    };

    GeoHash.prototype.dblclick = function (row, column, selected) {
        console.log("Double click:  " + JSON.stringify(row) + ", " + column + ", " + selected);
    };

    return GeoHash;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        var protocol = window.location.protocol === "https:" ? "https:" : "http:";  //  Could be "file:"
        var __hpcc_gmap_apikey = __hpcc_gmap_apikey || "AIzaSyDwGn2i1i_pMZvnqYJN1BksD_tjYaCOWKg";
        define('map/GMap',["d3", "../common/HTMLWidget", "../layout/AbsoluteSurface", "async!" + protocol + "//maps.google.com/maps/api/js?key=" + __hpcc_gmap_apikey, "css!./GMap"], factory);
    } else {
        root.map_GMap = factory(root.d3, root.common_HTMLWidget, root.layout_AbsoluteSurface);
    }
}(this, function (d3, HTMLWidget, AbsoluteSurface) {

    function Overlay(map, worldSurface, viewportSurface) {
        google.maps.OverlayView.call(this);
        this._div = null;

        this._worldSurface = worldSurface;
        this._viewportSurface = viewportSurface;

        this._map = map;
        this.setMap(map);

        var context = this;
        google.maps.event.addListener(map, "bounds_changed", function () {
            context.draw();
        });
        google.maps.event.addListener(map, "projection_changed", function () {
            context.draw();
        });

        this._prevWorldMin = { x: 0, y: 0 };
        this._prevWorldMax = { x: 0, y: 0 };
        this._prevMin = { x: 0, y: 0 };
        this._prevMax = { x: 0, y: 0 };
    }
    Overlay.prototype = google.maps.OverlayView.prototype;

    Overlay.prototype.onAdd = function () {
        this.div = document.createElement("div");

        this._viewportSurface
            .target(this.div)
            .units("pixels")
        ;

        var panes = this.getPanes();
        panes.overlayMouseTarget.appendChild(this.div);
    };

    Overlay.prototype.draw = function () {
        var projection = this.getProjection();
        if (!projection)
            return;

        var bounds = this._map.getBounds();
        var center = projection.fromLatLngToDivPixel(bounds.getCenter());
        var sw = projection.fromLatLngToDivPixel(bounds.getSouthWest());
        var ne = projection.fromLatLngToDivPixel(bounds.getNorthEast());

        var min = {
            x: sw.x,
            y: ne.y
        };
        var max = {
            x: ne.x,
            y: sw.y
        };

        var worldWidth = projection.getWorldWidth();
        while (max.x < min.x + 100) {  //  Ignoe dateline from being the rect.
            max.x += worldWidth;
        }
        while (min.x > center.x) {
            min.x -= worldWidth;
            max.x -= worldWidth;
        }

        if (min.x !== this._prevMin.x || min.y !== this._prevMin.y || max.x !== this._prevMax.x || max.y !== this._prevMax.y) {
            this._viewportSurface
                .widgetX(min.x)
                .widgetY(min.y)
                .widgetWidth(max.x - min.x)
                .widgetHeight(max.y - min.y)
            ;
            //  FF Issue on initial render (GH-1855) ---
            if (this._viewportSurface._renderCount) {
                this._viewportSurface.render();
                this._prevMin = min;
                this._prevMax = max;
            } else {
                this._viewportSurface.lazyRender();
            }
        }

        var worldMin = projection.fromLatLngToDivPixel(new google.maps.LatLng(85, -179.9));
        var worldMax = projection.fromLatLngToDivPixel(new google.maps.LatLng(-85, 179.9));
        while (worldMax.x < worldMin.x + 100) {  //  Ignoe dateline from being the rect.
            worldMax.x += worldWidth;
        }
        while (worldMin.x > center.x) {
            worldMin.x -= worldWidth;
            worldMax.x -= worldWidth;
        }
        if (worldMin.x !== this._prevWorldMin.x || worldMin.y !== this._prevWorldMin.y || worldMax.x !== this._prevWorldMax.x || worldMax.y !== this._prevWorldMax.y) {
            this._worldSurface
                .widgetX(worldMin.x)
                .widgetY(worldMin.y)
                .widgetWidth(worldMax.x - worldMin.x)
                .widgetHeight(worldMax.y - worldMin.y)
                .render()
            ;
            this._prevWorldMin = worldMax;
            this._prevWorldMax = worldMax;
        }
    };

    Overlay.prototype.onRemove = function () {
        this._viewportSurface.target(null);
        this._div.parentNode.removeChild(this._div);
        this._div = null;
    };

    function GMap() {
        HTMLWidget.call(this);

        this._tag = "div";

        var context = this;
        function calcProjection(surface, lat, long) {
            var projection = context._overlay.getProjection();
            var retVal = projection.fromLatLngToDivPixel(new google.maps.LatLng(lat, long));
            var worldWidth = projection.getWorldWidth();
            var widgetX = parseFloat(surface.widgetX());
            var widgetY = parseFloat(surface.widgetY());
            var widgetWidth = parseFloat(surface.widgetWidth());
            retVal.x -= widgetX;
            retVal.y -= widgetY;
            while (retVal.x < 0) {
                retVal.x += worldWidth;
            }
            while (retVal.x > widgetWidth) {
                retVal.x -= worldWidth;
            }
            return retVal;
        }

        this._worldSurface = new AbsoluteSurface();
        this._worldSurface.project = function (lat, long) {
            return calcProjection(this, lat, long);
        };

        this._viewportSurface = new AbsoluteSurface();
        this._viewportSurface.project = function (lat, long) {
            return calcProjection(this, lat, long);
        };
    }
    GMap.prototype = Object.create(HTMLWidget.prototype);
    GMap.prototype.constructor = GMap;
    GMap.prototype._class += " map_GMap";

    GMap.prototype.publish("type", "road", "set", "Map Type", ["terrain", "road", "satellite", "hybrid"], { tags: ["Basic"] });
    GMap.prototype.publish("centerLat", 42.877742, "number", "Center Latitude", null, { tags: ["Basic"] });
    GMap.prototype.publish("centerLong", -97.380979, "number", "Center Longtitude", null, { tags: ["Basic"] });
    GMap.prototype.publish("zoom", 4, "number", "Zoom Level", null, { tags: ["Basic"] });

    GMap.prototype.publish("panControl", true, "boolean", "Pan Controls", null, { tags: ["Basic"] });
    GMap.prototype.publish("zoomControl", true, "boolean", "Pan Controls", null, { tags: ["Basic"] });
    GMap.prototype.publish("mapTypeControl", false, "boolean", "Pan Controls", null, { tags: ["Basic"] });
    GMap.prototype.publish("scaleControl", true, "boolean", "Pan Controls", null, { tags: ["Basic"] });
    GMap.prototype.publish("streetViewControl", false, "boolean", "Pan Controls", null, { tags: ["Basic"] });
    GMap.prototype.publish("overviewMapControl", false, "boolean", "Pan Controls", null, { tags: ["Basic"] });

    GMap.prototype.publish("googleMapStyles", {}, "object", "Styling for map colors etc", null, { tags: ["Basic"] });

    GMap.prototype.data = function (_) {
        var retVal = HTMLWidget.prototype.data.apply(this, arguments);
        return retVal;
    };

    GMap.prototype.getMapType = function () {
        switch (this.type()) {
            case "terrain":
                return google.maps.MapTypeId.TERRAIN;
            case "road":
                return google.maps.MapTypeId.ROADMAP;
            case "satellite":
                return google.maps.MapTypeId.SATELLITE;
            case "hybrid":
                return google.maps.MapTypeId.HYBRID;
            default:
                return google.maps.MapTypeId.ROADMAP;
        }
    };

    GMap.prototype.getMapOptions = function () {
        return {
            panControl: this.panControl(),
            zoomControl: this.zoomControl(),
            mapTypeControl: this.mapTypeControl(),
            scaleControl: this.scaleControl(),
            streetViewControl: this.streetViewControl(),
            overviewMapControl: this.overviewMapControl(),
            overviewMapControlOptions: { opened: true },
            styles: this.googleMapStyles()
        };
    };

    GMap.prototype.size = function (_) {
        var retVal = HTMLWidget.prototype.size.apply(this, arguments);
        if (arguments.length && this._googleMapNode) {
            this._googleMapNode.style({
                width: _.width + "px",
                height: _.height + "px",
            });
            google.maps.event.trigger(this._googleMap, "resize");
        }
        return retVal;
    };

    GMap.prototype.enter = function (domNode, element) {
        HTMLWidget.prototype.enter.apply(this, arguments);
        this._googleMapNode = element.append("div")
            .style({
                width: this.width() + "px",
                height: this.height() + "px"
            })
        ;
        this._googleMap = new google.maps.Map(this._googleMapNode.node(), {
            zoom: this.zoom(),
            center: new google.maps.LatLng(this.centerLat(), this.centerLong()),
            mapTypeId: this.getMapType(),
            disableDefaultUI: true
        });
        this._overlay = new Overlay(this._googleMap, this._worldSurface, this._viewportSurface);

        this._circleMap = d3.map([]);
        this._pinMap = d3.map([]);

        this._prevCenterLat = this.centerLat();
        this._prevCenterLong = this.centerLong();
        this._prevZoom = this.zoom();
    };

    GMap.prototype.update = function (domNode, element) {
        this._googleMap.setMapTypeId(this.getMapType());
        this._googleMap.setOptions(this.getMapOptions());

        if (this._prevCenterLat !== this.centerLat() || this._prevCenterLong !== this.centerLong()) {
            this._googleMap.setCenter(new google.maps.LatLng(this.centerLat(), this.centerLong()));

            this._prevCenterLat = this.centerLat();
            this._prevCenterLong = this.centerLong();
        }
        if (this._prevZoom !== this.zoom()) {
            this._googleMap.setZoom(this.zoom());

            this._prevZoom = this.zoom();
        }
        this.updateCircles();
        this.updatePins();
    };

    GMap.prototype.updateCircles = function () {
        function rowID(row) {
            return row[0] + "_" + row[1];
        }

        var circle_enter = [];
        var circle_update = [];
        var circle_exit = d3.map(this._circleMap.keys(), function (d) { return d; });
        this.data().forEach(function (row) {
            circle_exit.remove(rowID(row));
            if (row[3] && !this._circleMap.has(rowID(row))) {
                circle_enter.push(row);
            } else if (row[3] && this._circleMap.has(rowID(row))) {
                circle_update.push(row);
            } else if (!row[3] && this._circleMap.has(rowID(row))) {
                circle_exit.set(rowID(row), true);
            }
        }, this);

        circle_enter.forEach(function (row) {
            var marker = this.createCircle(row[0], row[1], row[3], "");
            this._circleMap.set(rowID(row), marker);
        }, this);

        circle_update.forEach(function (row) {
            //this._pinMap.get(rowID(row)).setIcon(this.createIcon(row[3]));
        }, this);

        var context = this;
        circle_exit.forEach(function (row) {
            context._circleMap.get(row).setMap(null);
            context._circleMap.remove(row);
        });
    };

    GMap.prototype.updatePins = function () {
        function rowID(row) {
            return row[0] + "_" + row[1];
        }

        var pin_enter = [];
        var pin_update = [];
        var pin_exit = d3.map(this._pinMap.keys(), function (d) { return d; });
        this.data().forEach(function (row) {
            pin_exit.remove(rowID(row));
            if (row[2] && !this._pinMap.has(rowID(row))) {
                pin_enter.push(row);
            } else if (row[2] && this._pinMap.has(rowID(row))) {
                pin_update.push(row);
            } else if (!row[2] && this._pinMap.has(rowID(row))) {
                pin_exit.set(rowID(row), true);
            }
        }, this);

        pin_enter.forEach(function (row) {
            var marker = this.createMarker(row[0], row[1], row[2], "");
            this._pinMap.set(rowID(row), marker);
        }, this);

        pin_update.forEach(function (row) {
            this._pinMap.get(rowID(row)).setIcon(this.createIcon(row[2]));
        }, this);

        var context = this;
        pin_exit.forEach(function (row) {
            context._pinMap.get(row).setMap(null);
            context._pinMap.remove(row);
        });
    };

    GMap.prototype.createIcon = function (pinObj) {
        return {
            path: "M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z M -2,-30", // a 2,2 0 1,1 4,0 2,2 0 1,1",
            fillColor: pinObj.fillColor,
            fillOpacity: pinObj.fillOpacity || 0.8,
            scale: 0.5,
            strokeColor: pinObj.strokeColor || "black",
            strokeWeight: 0.25
        };
    };

    GMap.prototype.createMarker = function (lat, lng, pinObj) {
        return new google.maps.Marker({
            position: new google.maps.LatLng(lat, lng),
            animation: google.maps.Animation.DROP,
            title: pinObj.title || "",
            icon: this.createIcon(pinObj),
            map: this._googleMap,
        });
    };

    GMap.prototype.createCircle = function (lat, lng, circleObj) {
        return new google.maps.Circle({
            center: new google.maps.LatLng(lat, lng),
            radius: 16093 * circleObj.radius / 10,    // 16093 === 10 miles in metres
            fillColor: circleObj.fillColor || "red",
            strokeColor: circleObj.strokeColor || circleObj.fillColor || "black",
            strokeWeight: 0.5,
            map: this._googleMap
        });
    };

    GMap.prototype.zoomTo = function (selection) {
        var foundCount = 0;
        var latlngbounds = new google.maps.LatLngBounds();
        selection.forEach(function (item) {
            var gLatLong = new google.maps.LatLng(item[0], item[1]);
            latlngbounds.extend(gLatLong);
            ++foundCount;
        });
        if (foundCount) {
            this._googleMap.setCenter(latlngbounds.getCenter());
            this._googleMap.fitBounds(latlngbounds);
            if (this._googleMap.getZoom() > 12) {
                this._googleMap.setZoom(12);
            }
        }
        return this;
    };

    GMap.prototype.zoomToFit = function () {
        return this.zoomTo(this.data());
    };

    return GMap;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/GMapGraph.js',["./GMap", "../graph/Graph", "../graph/Edge", "../common/Shape"], factory);
    } else {
        root.map_GMapGraph = factory(root.map_GMap, root.graph_Graph, root.graph_Edge, root.common_Shape);
    }
}(this, function (GMap, Graph, Edge, Shape) {
    function GMapGraph() {
        GMap.call(this);
    }
    GMapGraph.prototype = Object.create(GMap.prototype);
    GMapGraph.prototype.constructor = GMapGraph;
    GMapGraph.prototype._class += " map_GMapGraph";

    GMapGraph.prototype.enter = function () {
        GMap.prototype.enter.apply(this, arguments);
        var graph = new Graph()
            .layout("None")
        ;

        var origRender = graph.render;
        var context = this;
        graph.render = function () {
            var vertices = [];
            var edges = [];
            var prevAddr = null;
            context.data().forEach(function (row) {
                var pos2 = context._viewportSurface.project(row[0], row[1]);
                var newAddr = new Shape()
                    .shape("circle")
                    .radius(3)
                    .data(row)
                    .pos(pos2)
                ;
                vertices.push(newAddr);
                if (prevAddr) {
                    edges.push(new Edge()
                        .sourceVertex(prevAddr)
                        .targetVertex(newAddr)
                        .targetMarker("arrowHead")
                    );
                }
                prevAddr = newAddr;
            });
            this.data({ vertices: vertices, edges: edges });
            origRender.apply(this, arguments);
            this.graphData.nodeValues().forEach(function (vertex) {
                var pos = context._viewportSurface.project(vertex.data()[0], vertex.data()[1]);
                pos.x -= context.width() / 2;
                pos.y -= context.height() / 2;
                vertex.move(pos);
            });
            this.graphData.edgeValues().forEach(function (edge) {
                edge.points([]);
            });
        };

        this._viewportSurface.widget(graph);
    };

    return GMapGraph;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/GMapHeat.js',["./GMap", "../other/HeatMap"], factory);
    } else {
        root.map_GMapHeat = factory(root.map_GMap, root.other_HeatMap);
    }
}(this, function (GMap, HeatMap) {
    function GMapHeat() {
        GMap.call(this);
    }
    GMapHeat.prototype = Object.create(GMap.prototype);
    GMapHeat.prototype.constructor = GMapHeat;
    GMapHeat.prototype._class += " map_GMapHeat";

    GMapHeat.prototype.enter = function () {
        GMap.prototype.enter.apply(this, arguments);
        var heat = new HeatMap();

        var origRender = heat.render;
        var context = this;
        heat.render = function () {
            this.data(context.data().map(function (row) {
                var pos = context._viewportSurface.project(row[0], row[1]);
                return [pos.x, pos.y, row[4]];
            }));
            origRender.apply(this, arguments);
        };

        this._viewportSurface.widget(heat);
    };

    return GMapHeat;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/GMapLayered',["d3", "./GMap", "../common/SVGWidget"], factory);
    } else {
        root.map_GMapLayered = factory(root.d3, root.map_GMap, root.common_SVGWidget);
    }
}(this, function (d3, GMap, SVGWidget) {
    var zoomFactor = 1 / (1 << 4);
    var projectionFactor = 1 << 12;
    function Layered() {
        SVGWidget.call(this);
        this._drawStartPos = "origin";
    }
    Layered.prototype = Object.create(SVGWidget.prototype);
    Layered.prototype.constructor = Layered;
    Layered.prototype._class += " map_Layered map_GMapLayered";

    Layered.prototype.enter = function (domNode, element) {
        SVGWidget.prototype.enter.apply(this, arguments);
        this._zoom = d3.behavior.zoom()
            .translate([0, 0])
            .scale(1)
        ;
        this._d3GeoProjection = d3.geo.mercator()
            .scale(projectionFactor / 2 / Math.PI)
            .translate([0, 0])
        ;
        this._d3GeoPath = d3.geo.path()
            .projection(this._d3GeoProjection)
        ;
    };

    Layered.prototype.update = function (domNode, element) {
        SVGWidget.prototype.update.apply(this, arguments);
        this._hasZoomed = true;
        if (!this._hasRendered) {
            this.fullRender();
        } else {
            this.zoomed();
        }
    };

    Layered.prototype.fullRender = function () {
        if (!this._hasZoomed) return;
        this._hasRendered = true;

        this.size(this.gmap.size());
        var layers = this._element.selectAll(".layerContainer").data(this.gmap.layers(), function (d) { return d.id(); });
        var context = this;
        layers.enter().append("g")
            .attr("class", "layerContainer")
            .each(function (d) {
                var svgElement = d3.select(this);
                var domElement = context._parentOverlay.append("div");
                d.layerEnter(context, svgElement, domElement);
            })
        ;
        layers
            .each(function (d) {
                d.layerUpdate(context);
            })
        ;
        layers.exit()
            .each(function (d) {
                d.layerExit(context);
            })
            .remove()
        ;
        this.zoomed();
    };

    Layered.prototype.zoomed = function () {
        var projection = this.gmap._overlay.getProjection();
        if (projection) {
            var center = new google.maps.LatLng(0, 0);
            var pos = projection.fromLatLngToDivPixel(center);
            var widgetX = parseFloat(this.surface.widgetX());
            var widgetY = parseFloat(this.surface.widgetY());
            var translate = [(pos.x - widgetX), (pos.y - widgetY)];

            var zoom = this.gmap._googleMap.getZoom();
            this._zoom
                .scale(zoomFactor * (1 << zoom))
                .translate(translate)
            ;

            var layers = this._element.selectAll(".layerContainer");
            var context = this;
            layers
                .each(function (d) {
                    d.layerZoomed(context);
                })
            ;
        }
    };

    Layered.prototype.projection = function () {
        return "mercator";
    };

    Layered.prototype.project = function (lat, long) {
        var retVal = this.surface.project(lat, long);
        return [retVal.x, retVal.y];
    };

    function GMapLayered() {
        GMap.call(this);

        this._layers = [];
    }
    GMapLayered.prototype = Object.create(GMap.prototype);
    GMapLayered.prototype.constructor = GMapLayered;
    GMapLayered.prototype._class += " map_GMapLayered";

    GMapLayered.prototype.updateCircles = function () { };
    GMapLayered.prototype.updatePins = function () { };

    GMapLayered.prototype.layers = function (_) {
        if (!arguments.length) return this._layers;
        this._layers = _;
        return this;
    };

    GMapLayered.prototype.enter = function () {
        GMap.prototype.enter.apply(this, arguments);

        this.layered = new Layered();
        this.layered.gmap = this;
        this.layered.surface = this._viewportSurface;

        this.layered.surface.widget(this.layered).render();
    };

    GMapLayered.prototype.render = function (callback) {
        var retVal = GMap.prototype.render.apply(this, arguments);
        this.layered.fullRender();
        return retVal;
    };

    return GMapLayered;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/Pins.js',["d3", "./Layer", "./Utility", "../common/Palette", "../common/Utility", "css!./Pins"], factory);
    } else {
        root.map_Pins = factory(root.d3, root.map_Layer, root.map_Utility, root.common_Palette, root.common_Utility);
    }
}(this, function (d3, Layer, MapUtility, Palette, Utility) {
    function Pins() {
        Layer.call(this);
        Utility.SimpleSelectionMixin.call(this);
        this._geohash = new MapUtility.Geohash();
    }
    Pins.prototype = Object.create(Layer.prototype);
    Pins.prototype.constructor = Pins;
    Pins.prototype._class += " map_Pins";
    Pins.prototype.mixin(Utility.SimpleSelectionMixin);

    Pins.prototype.publish("geohashColumn", null, "set", "Geohash column", function () { return this.columns(); }, { optional: true });
    Pins.prototype.publish("tooltipColumn", null, "set", "Tooltip column", function () { return this.columns(); }, { optional: true });
    Pins.prototype.publish("opacity", 1.0, "number", "Opacity", null, { tags: ["Advanced"] });
    Pins.prototype.publish("fillColor", "#00FFDD", "html-color", "Pin Color", null, { optional: true });
    
    Pins.prototype.publish("strokeWidth", 0.5, "number", "Pin Border Thickness (pixels)", null, { tags: ["Basic"] });
    Pins.prototype.publish("strokeColor", null, "html-color", "Pin Border Color", null, { optional: true });
    
    Pins.prototype.publish("fontSize", 18, "number", "Font Size",null,{tags:["Basic","Shared"]});
    Pins.prototype.publish("fontFamily", "Verdana", "string", "Font Name",null,{tags:["Basic","Shared","Shared"]});
    Pins.prototype.publish("fontColor", "#000000", "html-color", "Font Color",null,{tags:["Basic","Shared"]});
    
    Pins.prototype.publish("pinType", "pin", "set", "Pin Type", ["pin","circle","rectangle","rectangle-pin"], { tags: ["Basic"] });
    Pins.prototype.publish("arrowWidth", 8, "number", "Pin arrow width (pixels)", null, { tags: ["Basic"], disable: function(w) { return ["pin","rectangle-pin"].indexOf(w.pinType()) === -1; } });
    Pins.prototype.publish("arrowHeight", 12, "number", "Pin arrow height (pixels)", null, { tags: ["Basic"], disable: function(w) { return ["pin","rectangle-pin"].indexOf(w.pinType()) === -1; } });
    
    Pins.prototype.publish("pinWidth", 20, "number", "Width of pin (pixels)", null, { tags: ["Basic"], disable: function(w) { return ["rectangle","rectangle-pin"].indexOf(w.pinType()) === -1; } });
    Pins.prototype.publish("pinHeight", 20, "number", "Height of pin (pixels) (not including arrow)", null, { tags: ["Basic"], disable: function(w) { return ["rectangle","rectangle-pin"].indexOf(w.pinType()) === -1; } });
    Pins.prototype.publish("cornerRadius", 10, "number", "Radius of rectangular pin corners (pixels)", null, { tags: ["Basic"], disable: function(w) { return ["rectangle","rectangle-pin"].indexOf(w.pinType()) === -1; } });
    
    Pins.prototype.publish("pinRadius", 12, "number", "Radius of circle (pixels)", null, { tags: ["Basic"], disable: function(w) { return w.pinType() !== "circle"; } });
    
    Pins.prototype.publish("textBaseline", "central", "set", "Pin text vertical alignment", ["auto","use-script","no-change","reset-size","ideographic","alphabetic","hanging","mathematical","central","middle","text-after-edge","text-before-edge","inherit"], { tags: ["Basic"] });

    Pins.prototype.pinsData = function () {
        var geohashField = this._db.fieldByLabel(this.geohashColumn());
        var tooltipField = this._db.fieldByLabel(this.tooltipColumn());
        return this.data().map(function (row) {
            var retVal = {
                lat: row[0],
                long: row[1],
                ext: row[2] instanceof Object ? row[2] : {},
                origRow: row
            };
            if (geohashField) {
                try {
                    var pos = this._geohash.bounds(row[geohashField.idx]);
                    retVal.lat = (pos.ne.lat + pos.sw.lat) / 2;
                    retVal.long = (pos.ne.lon + pos.sw.lon) / 2;
                } catch (e) {
                }
            }
            if (tooltipField) {
                retVal.ext.tooltip = row[tooltipField.idx];
            }
            return retVal;
        }, this);
    };

    Pins.prototype.layerEnter = function (base, svgElement, domElement) {
        Layer.prototype.layerEnter.apply(this, arguments);

        this._pinsTransform = svgElement;
        this._selection.widgetElement(this._pinsTransform);
        this.pinsPaths = d3.select(null);
    };

    Pins.prototype.layerUpdate = function (base) {
        Layer.prototype.layerUpdate.apply(this, arguments);

        this._pinsTransform
            .style("opacity", this.opacity())
        ;

        this.pinsPaths = this._pinsTransform.selectAll(".pin").data(this.visible() ? this.pinsData() : []);
        var context = this;
        var gPinEnter = this.pinsPaths.enter().append("g")
            .attr("class", "pin")
            .call(this._selection.enter.bind(this._selection))
            .on("click", function (d) {
                context.click(context.rowToObj(d.origRow), "geohash", context._selection.selected(this));
            })
            .on("dblclick", function (d) {
                context.dblclick(context.rowToObj(d[2].origRow), "geohash", context._selection.selected(this));
            })
            .on('mouseover', function (d) {
                if (!context.isIE) {
                    this.parentNode.appendChild(this);
                }
            })
        ;
        gPinEnter
            .append("path")
            .attr("class", "data")
            .append("title")
        ;
        gPinEnter
            .append("text")
            .attr("text-anchor","middle")
        ;
        this.pinsPaths.selectAll("text")
            .style("stroke", this.fontColor())
            .style("fill", this.fontColor())
            .style("font-size", this.fontSize())
            .style("font-family", this.fontFamily())
            .style("dominant-baseline",this.textBaseline())
            .attr("dx",0)
            .attr("dy",this.pinTextDY())
            .text(function(d){
                return d.ext && d.ext.text ? d.ext.text : "";
            });
        var svgPath = this.svgPinPath();
        this.pinsPaths.selectAll("path.data")
            .attr("d", svgPath)
            .attr("stroke-width", this.strokeWidth() + "px")
            .style("display", function (d) {
                var pos = base.project(d.lat, d.long);
                if (!pos) {
                    return "none";
                }
                return null;
            })
            .style("stroke", function (d) {
                return d.ext && d.ext.strokeColor ? d.ext.strokeColor : context.strokeColor();
            })
            .style("fill", function (d) {
                return d.ext && d.ext.fillColor ? d.ext.fillColor : context.fillColor();
            })
        ;
        this.pinsPaths.select("title")
            .text(function (d) {
                return d.ext && d.ext.tooltip ? d.ext.tooltip : "";
            })
        ;
        this.pinsPaths.exit().remove();
    };

    Pins.prototype.layerZoomed = function (base) {
        Layer.prototype.layerZoomed.apply(this, arguments);
        this.pinsPaths
            .attr("transform", function (d) {
                var pos = base.project(d.lat, d.long);
                if (!pos) {
                    pos = [0, 0];
                }
                return "translate(" + pos[0] + ", " + pos[1] + ")scale(" + 1 + ")";
            })
        ;
    };

    Pins.prototype.pinTextDY = function(){
        switch(this.pinType()){
            case "pin":
            case "rectangle-pin": 
                return -this.arrowHeight();
            case "circle":
            case "rectangle": 
                return 0;
        }
    };
    Pins.prototype.svgPinPath = function(){
        switch(this.pinType()){
            case "pin":
                return this.circlePinPath();
            case "circle":
                return this.circlePath();
            case "rectangle": 
                return this.rectanglePath();
            case "rectangle-pin": 
                return this.rectanglePinPath();
        }
    };

    Pins.prototype.rectanglePinPath = function() {
        var width = this.pinWidth();
        var height = this.pinHeight();
        var radius = this.cornerRadius();
        var arrow_h = this.arrowHeight();
        var arrow_w = this.arrowWidth();
        var x = 0 - width/2;
        var y = 0 - height + radius;
        var arrow_b = (width - radius*2 - arrow_w)/2;
        return "M" + x + "," + y +
           "a" + -radius + "," + -radius + " 0 0 1 " + radius + "," + -radius +
           "h" + (width + -radius*2) +
           "a" + radius + "," + radius + " 0 0 1 " + radius + "," + radius +
           "v" + (height + -radius*2) +
           "a" + radius + "," + radius + " 0 0 1 " + -radius + "," + radius +
           "h" + -arrow_b +
           "l" + -arrow_w/2 + "," + arrow_h +
           "l" + -arrow_w/2 + "," + -arrow_h +
           "h" + -arrow_b +
           "a" + -radius + "," + -radius + " 0 0 1 " + -radius + "," + -radius +
           "z";
    };
    Pins.prototype.rectanglePath = function() {
        var width = this.pinWidth();
        var height = this.pinHeight();
        var radius = this.cornerRadius();
        var x = -width/2;
        var y = -height/2;
        y += radius;
        return "M" + x + "," + y +
           "a" + -radius + "," + -radius + " 0 0 1 " + radius + "," + -radius +
           "h" + (width + -radius*2) +
           "a" + radius + "," + radius + " 0 0 1 " + radius + "," + radius +
           "v" + (height + -radius*2) +
           "a" + radius + "," + radius + " 0 0 1 " + -radius + "," + radius +
           "h" + (-width + radius*2) +
           "a" + -radius + "," + -radius + " 0 0 1 " + -radius + "," + -radius +
           "z";
    };
    Pins.prototype.circlePinPath = function() {
        var arrow_h = this.arrowHeight();
        var arrow_w = this.arrowWidth();
        var x = 0 - arrow_w/2;
        var y = 0 - arrow_h;
        var bezier_x = arrow_w/2;
        var bezier_y = arrow_h;
        var c_dx1 = -bezier_x;
        var c_dy1 = -bezier_y;
        var c_dx2 = arrow_w + bezier_x;
        var c_dy2 = c_dy1;
        var c_dx = arrow_w;
        var c_dy = 0;
        return "M" + x + "," + y +
           "c" + c_dx1 + " " + c_dy1 + ", " + c_dx2 + " " + c_dy2 + ", " + c_dx + " " + c_dy +
           "l" + -arrow_w/2 + "," + arrow_h +
           "l" + -arrow_w/2 + "," + -arrow_h +
           "z";
    };
    Pins.prototype.circlePath = function() {
        var radius = this.pinRadius();
        var x = radius/2;
        var y = 0;
        var a_dx = radius/2;
        var a_dy = radius/2;
        return "M" + x + "," + y +
           "a " + a_dx + " " + a_dy + " 0 1 0 0 0.01 0" +
           "z";
    };

    //  Events  ---
    Pins.prototype.click = function (row, column, selected) {
        console.log("Click:  " + JSON.stringify(row) + ", " + column + ", " + selected);
    };

    Pins.prototype.dblclick = function (row, column, selected) {
        console.log("Double click:  " + JSON.stringify(row) + ", " + column + ", " + selected);
    };

    return Pins;
}));

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/GMapPin.js',["d3", "./GMapLayered", "./Pins"], factory);
    } else {
        root.map_GMapPin = factory(root.d3, root.map_GMapLayered, root.map_Pins);
    }
}(this, function (d3, GMapLayered, Pins) {
    function GMapPin(target) {
        GMapLayered.call(this);

        var context = this;
        this._pins = new Pins()
            .columns(["lat", "long", "ext"])
            .on("click", function (row, col, sel) {
                context.click(context.rowToObj(row.ext.origRow), "", sel);
            })
            .on("dblclick", function (row, col, sel) {
                context.dblclick(context.rowToObj(row.ext.origRow), "", sel);
            })
        ;
    }
    GMapPin.prototype = Object.create(GMapLayered.prototype);
    GMapPin.prototype.constructor = GMapPin;
    GMapPin.prototype._class += " map_GMapPin";

    GMapPin.prototype.publishProxy("pinColor", "_pins", "fillColor");
    GMapPin.prototype.publishProxy("pinType", "_pins", "pinType");
    GMapPin.prototype.publishProxy("pinWidth", "_pins", "pinWidth");
    GMapPin.prototype.publishProxy("pinHeight", "_pins", "pinHeight");
    GMapPin.prototype.publishProxy("cornerRadius", "_pins", "cornerRadius");
    GMapPin.prototype.publishProxy("pinRadius", "_pins", "pinRadius");
    GMapPin.prototype.publishProxy("arrowWidth", "_pins", "arrowWidth");
    GMapPin.prototype.publishProxy("arrowHeight", "_pins", "arrowHeight");
    GMapPin.prototype.publishProxy("textBaseline", "_pins", "textBaseline");
    GMapPin.prototype.publishProxy("strokeWidth", "_pins", "strokeWidth");

    GMapPin.prototype.publish("latitudeColumn", null, "set", "Latitude", function () { return this.columns(); }, { optional: true });
    GMapPin.prototype.publish("longtitudeColumn", null, "set", "Longtitude", function () { return this.columns(); }, { optional: true });
    GMapPin.prototype.publish("colorColumn", null, "set", "Color", function () { return this.columns(); }, { optional: true });
    GMapPin.prototype.publish("tooltipColumn", null, "set", "Tooltip", function () { return this.columns(); }, { optional: true });

    GMapPin.prototype.pinsData = function () {
        var columns = this.columns();
        this._view = this._db.rollupView([this.latitudeColumn(), this.longtitudeColumn()]);
        return this._view.entries().map(function (row) {
            var firstRow = row.values[0].values[0];
            return [row.key, row.values[0].key, {
                fillColor: firstRow[columns.indexOf(this.colorColumn())],
                tooltip: firstRow[columns.indexOf(this.tooltipColumn())],
                origRow: firstRow
            }];
        }, this);
    };

    GMapPin.prototype.enter = function (domNode, element) {
        GMapLayered.prototype.enter.apply(this, arguments);
        this
            .layers([
                this._pins
            ])
        ;
    };

    GMapPin.prototype.update = function (domNode, element) {
        GMapLayered.prototype.update.apply(this, arguments);
        this._pins.data(this.pinsData());
    };

    GMapPin.prototype.exit = function (domNode, element) {
        GMapLayered.prototype.exit.apply(this, arguments);
    };

    GMapPin.prototype.click = function (row, column, selected) {
        console.log("Click:  " + JSON.stringify(row) + ", " + column + "," + selected);
    };

    GMapPin.prototype.dblclick = function (row, column, selected) {
        console.log("Double click:  " + JSON.stringify(row) + ", " + column + "," + selected);
    };

    return GMapPin;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/Lines.js',["d3", "./Layer", "css!./Lines"], factory);
    } else {
        root.map_Graph = factory(root.d3, root.map_Layer);
    }
}(this, function (d3, Layer) {
    function Lines() {
        Layer.call(this);
    }
    Lines.prototype = Object.create(Layer.prototype);
    Lines.prototype.constructor = Lines;
    Lines.prototype._class += " map_Lines";

    Lines.prototype.publish("opacity", 1.0, "number", "Opacity", null, { tags: ["Advanced"] });

    Lines.prototype.data = function (_) {
        var retVal = Layer.prototype.data.apply(this, arguments);
        if (arguments.length) {
            this.dataEdges = [];
            _.forEach(function (row) {
                this.dataEdges.push({
                    type: "LineString",
                    coordinates: [[row[1], row[0]], [row[3], row[2]]]
                });
            }, this);
        }
        return retVal;
    };

    Lines.prototype.layerEnter = function (base, svgElement, domElement) {
        Layer.prototype.layerEnter.apply(this, arguments);

        svgElement.append("defs").append("marker")
            .attr("class", "marker")
            .attr("id", this._id + "_arrowHead")
            .attr("viewBox", "0 0 10 10")
            .attr("refX", 10)
            .attr("refY", 5)
            .attr("markerWidth", 16)
            .attr("markerHeight", 16)
            .attr("markerUnits", "strokeWidth")
            .attr("orient", "auto")
            .append("polyline")
                .attr("points", "0,0 10,5 0,10 1,5")
        ;
        this._edgesTransform = svgElement.append("g");
        this.edgesPaths = d3.select(null);
    };

    Lines.prototype.layerUpdate = function (base) {
        Layer.prototype.layerUpdate.apply(this, arguments);

        this._edgesTransform
            .style("opacity", this.opacity())
        ;

        this.edgesPaths = this._edgesTransform.selectAll(".dataEdge").data(this.visible() ? this.dataEdges : []);
        this.edgesPaths.enter().append("path")
            .attr("class", "dataEdge")
            .attr("marker-end", "url(#" + this._id + "_arrowHead)")
        ;
        this.edgesPaths
            .attr("d", base._d3GeoPath)
        ;
        this.edgesPaths.exit().remove();
    };

    Lines.prototype.layerZoomed = function (base) {
        Layer.prototype.layerZoomed.apply(this, arguments);
        this._edgesTransform
            .attr("transform", "translate(" + base._zoom.translate() + ")scale(" + base._zoom.scale() + ")")
            .style("stroke-width", 0.5 / base._zoom.scale() + "px")
        ;
    };

    return Lines;
}));

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/GMapPinLine.js',["d3", "./GMapLayered", "./Lines", "./Pins"], factory);
    } else {
        root.map_GMapPinLine = factory(root.d3, root.map_GMapLayered, root.map_Lines, root.map_Pins);
    }
}(this, function (d3, GMapLayered, Lines, Pins) {
    function GMapPinLine(target) {
        GMapLayered.call(this);

        var context = this;
        this._lines = new Lines();
        this._pins = new Pins()
            .columns(["lat", "long", "ext"])
            .on("click", function (row, col, sel) {
                context.click(context.rowToObj(row.ext.origRow), "", sel);
            })
            .on("dblclick", function (row, col, sel) {
                context.click(context.rowToObj(row.ext.origRow), "", sel);
            })
        ;
    }
    GMapPinLine.prototype = Object.create(GMapLayered.prototype);
    GMapPinLine.prototype.constructor = GMapPinLine;
    GMapPinLine.prototype._class += " map_GMapPinLine";

    GMapPinLine.prototype.publish("fromPinColor", "green", "color", "From Pin Color");
    GMapPinLine.prototype.publish("fromLatitudeColumn", null, "set", "From Latitude", function () { return this.columns(); }, { optional: true });
    GMapPinLine.prototype.publish("fromLongtitudeColumn", null, "set", "From Longtitude", function () { return this.columns(); }, { optional: true });
    GMapPinLine.prototype.publish("fromColorColumn", null, "set", "From Color", function () { return this.columns(); }, { optional: true });
    GMapPinLine.prototype.publish("fromTooltipColumn", null, "set", "From Tooltip", function () { return this.columns(); }, { optional: true });

    GMapPinLine.prototype.publish("toPinColor", "red", "color", "To Pin Color");
    GMapPinLine.prototype.publish("toLatitudeColumn", null, "set", "To Latitude", function () { return this.columns(); }, { optional: true });
    GMapPinLine.prototype.publish("toLongtitudeColumn", null, "set", "To Longtitude", function () { return this.columns(); }, { optional: true });
    GMapPinLine.prototype.publish("toColorColumn", null, "set", "To Color", function () { return this.columns(); }, { optional: true });
    GMapPinLine.prototype.publish("toTooltipColumn", null, "set", "To Tooltip", function () { return this.columns(); }, { optional: true });

    GMapPinLine.prototype.pinsData = function () {
        var columns = this.columns();
        this._fromView = this._db.rollupView([this.fromLatitudeColumn(), this.fromLongtitudeColumn()]);
        this._toView = this._db.rollupView([this.toLatitudeColumn(), this.toLongtitudeColumn()]);
        var fromRetVal = this._fromView.entries().map(function (row) {
            var firstRow = row.values[0].values[0];
            return [row.key, row.values[0].key, {
                fillColor: firstRow[columns.indexOf(this.fromColorColumn())] || this.fromPinColor(),
                tooltip: firstRow[columns.indexOf(this.fromTooltipColumn())],
                origRow: firstRow
            }];
        }, this);
        var toRetVal = this._toView.entries().map(function (row) {
            var firstRow = row.values[0].values[0];
            return [row.key, row.values[0].key, {
                fillColor: firstRow[columns.indexOf(this.toColorColumn())] || this.toPinColor(),
                tooltip: firstRow[columns.indexOf(this.toTooltipColumn())],
                origRow: firstRow
            }];
        }, this);
        return fromRetVal.concat(toRetVal);
    };

    GMapPinLine.prototype.linesData = function () {
        this._linesView = this._db.rollupView([this.fromLatitudeColumn(), this.fromLongtitudeColumn(), this.toLatitudeColumn(), this.toLongtitudeColumn()]);
        return this._linesView.data();
    };

    GMapPinLine.prototype.enter = function (domNode, element) {
        GMapLayered.prototype.enter.apply(this, arguments);
        this
            .layers([
                this._lines,
                this._pins
            ])
        ;
    };

    GMapPinLine.prototype.update = function (domNode, element) {
        GMapLayered.prototype.update.apply(this, arguments);
        this._pins.data(this.pinsData());
        this._lines.data(this.linesData());
    };

    GMapPinLine.prototype.exit = function (domNode, element) {
        GMapLayered.prototype.exit.apply(this, arguments);
    };

    GMapPinLine.prototype.click = function (row, column, selected) {
        console.log("Click:  " + JSON.stringify(row) + ", " + column + "," + selected);
    };

    GMapPinLine.prototype.dblclick = function (row, column, selected) {
        console.log("Double click:  " + JSON.stringify(row) + ", " + column + "," + selected);
    };

    return GMapPinLine;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/Graph.js',["d3", "topojson", "./Pins", "../graph/Graph", "../graph/Edge", "../common/Shape", "css!./Graph"], factory);
    } else {
        root.map_Graph = factory(root.d3, root.topojson, root.map_Pins, root.graph_Graph, root.graph_Edge, root.common_Shape);
    }
}(this, function (d3, topojson, Pins, GraphGraph, Edge, Shape) {
    function Graph() {
        Pins.call(this);
    }
    Graph.prototype = Object.create(Pins.prototype);
    Graph.prototype.constructor = Graph;
    Graph.prototype._class += " map_Graph";

    Graph.prototype.data = function (_) {
        var retVal = Pins.prototype.data.apply(this, arguments);
        if (arguments.length) {
            this.dataEdges = [];
            var prevPin = null;
            _.forEach(function (row) {
                if (prevPin) {
                    this.dataEdges.push({
                        type: "LineString",
                        coordinates: [[prevPin[1], prevPin[0]],[row[1], row[0]]]
                    });
                }
                prevPin = row;
            }, this);
        }
        return retVal;
    };

    Graph.prototype.layerEnter = function (base, svgElement, domElement) {
        Pins.prototype.layerEnter.apply(this, arguments);

        svgElement.append("defs").append("marker")
            .attr("class", "marker")
            .attr("id", this._id + "_arrowHead")
            .attr("viewBox", "0 0 10 10")
            .attr("refX", 10)
            .attr("refY", 5)
            .attr("markerWidth", 16)
            .attr("markerHeight", 16)
            .attr("markerUnits", "strokeWidth")
            .attr("orient", "auto")
            .append("polyline")
                .attr("points", "0,0 10,5 0,10 1,5")
        ;
        this._edgesTransform = svgElement.append("g");
        this.edgesPaths = d3.select(null);
    };

    Graph.prototype.layerUpdate = function (base) {
        Pins.prototype.layerUpdate.apply(this, arguments);

        this._edgesTransform
            .style("opacity", this.opacity())
        ;

        this.edgesPaths = this._edgesTransform.selectAll(".dataEdge").data(this.visible() ? this.dataEdges : []);
        this.edgesPaths.enter().append("path")
            .attr("class", "dataEdge")
            .attr("marker-end", "url(#" + this._id + "_arrowHead)")
        ;
        this.edgesPaths
            .attr("d", base._d3GeoPath)
        ;
        this.edgesPaths.exit().remove();
    };

    Graph.prototype.layerZoomed = function (base) {
        Pins.prototype.layerZoomed.apply(this, arguments);
        this._edgesTransform
            .attr("transform", "translate(" + base._zoom.translate() + ")scale(" + base._zoom.scale() + ")")
            .style("stroke-width", 0.5 / base._zoom.scale() + "px")
        ;
    };

    return Graph;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/Graticule.js',["d3", "topojson", "./Layer", "../common/Palette", "css!./Graticule"], factory);
    } else {
        root.map_Graticule = factory(root.d3, root.topojson, root.map_Layer, root.common_Palette);
    }
}(this, function (d3, topojson, Layer, Palette) {
    function Graticule() {
        Layer.call(this);

        this._dataMap = {};
        this._path = d3.select(null);
    }
    Graticule.prototype = Object.create(Layer.prototype);
    Graticule.prototype.constructor = Graticule;
    Graticule.prototype._class += " map_Graticule";

    Graticule.prototype.publish("opacity", 1.0, "number", "Opacity", null, { tags: ["Advanced"] });

    Graticule.prototype.publish("meshColor", null, "html-color", "Stroke Color", null, { optional: true });
    Graticule.prototype.publish("meshStrokeWidth", 0.25, "number", "Stroke Width");

    Graticule.prototype.layerEnter = function (base, svgElement, domElement) {
        Layer.prototype.layerEnter.apply(this, arguments);

        this._graticule = d3.geo.graticule();
        this._graticulePath = svgElement.append("path")
            .datum(this._graticule)
            .attr("class", "graticule")
        ;
        this._graticuleOutlinePath = svgElement.append("path")
            .datum(this._graticule.outline)
            .attr("class", "graticuleOutline")
        ;
    };

    Graticule.prototype.layerUpdate = function (base) {
        if (!this.visible()) {
            this._graticulePath.attr("d", "");
            this._graticuleOutlinePath.attr("d", "");
            delete this._prevProjection;
            return;
        }

        if (this._prevProjection !== base.projection()) {
            this._graticulePath
                .attr("d", base._d3GeoPath)
            ;
            this._graticuleOutlinePath
                .attr("d", base._d3GeoPath)
            ;
            this._prevProjection = base.projection();
        }
        this._graticulePath
            .style("stroke", this.meshColor())
        ;
        this._graticuleOutlinePath
            .style("stroke", this.meshColor())
        ;
    };

    Graticule.prototype.layerExit = function (base) {
        delete this._prevProjection;
    };

    Graticule.prototype.layerZoomed = function (base) {
        this._graticulePath
            .style("opacity", this.opacity())
            .attr("transform", "translate(" + base._zoom.translate() + ")scale(" + base._zoom.scale() + ")")
            .style("stroke-width", this.meshStrokeWidth() / base._zoom.scale() + "px")
        ;
        this._graticuleOutlinePath
            .style("opacity", this.opacity())
            .attr("transform", "translate(" + base._zoom.translate() + ")scale(" + base._zoom.scale() + ")")
            .style("stroke-width", this.meshStrokeWidth() / base._zoom.scale() + "px")
        ;
    };

    return Graticule;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/Heat.js',["d3", "topojson", "./Layer", "../other/HeatMap", "../common/Palette", "css!./Heat"], factory);
    } else {
        root.map_Heat = factory(root.d3, root.topojson, root.map_Layer, root.other_HeatMap, root.common_Palette);
    }
}(this, function (d3, topojson, Layer, HeatMap, Palette) {
    function Heat() {
        Layer.call(this);
    }
    Heat.prototype = Object.create(Layer.prototype);
    Heat.prototype.constructor = Heat;
    Heat.prototype._class += " map_Heat";

    Heat.prototype.publish("opacity", 1.0, "number", "Opacity", null, { tags: ["Advanced"] });

    Heat.prototype.publish("meshColor", null, "html-color", "Stroke Color", null, { optional: true });
    Heat.prototype.publish("meshStrokeWidth", 0.25, "number", "Stroke Width");

    Heat.prototype.layerEnter = function (base, svgElement, domElement) {
        Layer.prototype.layerEnter.apply(this, arguments);
        this._parentOverlay.style("pointer-events", "none");
        this._heatTransform = domElement
            .style("pointer-events", "none")
            .append("div")
                .attr("class", this.classID())
                .style("width", base.width() + "px")
                .style("height", base.height() + "px")
        ;
        this.heat = new HeatMap()
            .target(this._heatTransform.node())
        ;
    };

    Heat.prototype.layerUpdate = function (base) {
        Layer.prototype.layerUpdate.apply(this, arguments);

        this._heatTransform
            .style("opacity", this.opacity())
            .style("width", base.width() + "px")
            .style("height", base.height() + "px")
        ;
        this.heat.resize(base.size());

        this.heat
            .columns(this.columns())
            .data(this.data().map(function (row) {
                var pos = base.project(row[0], row[1]);
                return [pos[0], pos[1], row[4]];
            }))
            .render()
        ;
    };

    Heat.prototype.layerExit = function (base) {
        delete this._prevProjection;
        this.heat.target(null);
        delete this.heat;
    };

    Heat.prototype.layerZoomed = function (base) {
        Layer.prototype.layerZoomed.apply(this, arguments);
        this.heat
            .columns(this.columns())
            .data(this.visible() ? this.data().map(function (row) {
                var pos = base.project(row[0], row[1]);
                return [pos[0], pos[1], row[4]];
            }) : [])
            .render()
        ;
    };

    return Heat;
}));

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/IChoropleth.js',["../common/Palette"], factory);
    } else {
        root.map_IChoropleth = factory(root.common_Palette, root.usStates, root.usCounties);
    }
}(this, function (Palette, usStates, usCounties) {
    function IChoropleth() {
    }
    IChoropleth.prototype._palette = Palette.rainbow("default");
    
    //  Events  ---
    IChoropleth.prototype.click = function (row, column, selected) {
        console.log("Click:  " + JSON.stringify(row) + ", " + column + ", " + selected);
    };


    return IChoropleth;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/OpenStreet.js',["d3", "topojson", "./Layer", "./Utility", "css!./OpenStreet"], factory);
    } else {
        root.map_OpenStreet = factory(root.d3, root.topojson, root.map_Layer, root.map_Utility);
    }
}(this, function (d3, topojson, Layer, Utility) {
    function OpenStreet() {
        Layer.call(this);
    }
    OpenStreet.prototype = Object.create(Layer.prototype);
    OpenStreet.prototype.constructor = OpenStreet;
    OpenStreet.prototype._class += " map_OpenStreet";

    OpenStreet.prototype._copyrightText = "© OpenStreetMap contributors";

    OpenStreet.prototype.publish("tileProvider", "OpenStreetMap", "set", "Tile Provider", ["OpenStreetMap", "OpenStreetMap Hot", "MapQuest", "MapQuest Sat", "Stamen Watercolor", "OpenCycleMap"], { tags: ["Basic", "Shared"] });

    OpenStreet.prototype.layerEnter = function (base, svgElement, domElement) {
        Layer.prototype.layerEnter.apply(this, arguments);

        this._tile = Utility.Tile();
        this._openStreetTransform = svgElement.append("g");
        this._openStreet = this._openStreetTransform.append("g");
        this._copyright = svgElement.append("text")
            .attr("x", -100)
            .attr("y", -100)
            .style("opacity", 0.5)
            .text(this._copyrightText)
        ;
        this._copyrightBBox = this._copyright.node().getBBox();
    };

    OpenStreet.prototype.layerUpdate = function (base) {
        if (!this.visible()) {
            this._copyright.text("");
        } else {
            this._copyright
                .attr("x", base.width() - this._copyrightBBox.width - this._copyrightBBox.height / 2)
                .attr("y", base.height() - this._copyrightBBox.height / 2)
                .text(this._copyrightText)
            ;
        }
    };

    OpenStreet.prototype.layerZoomed = function (base) {
        var tiles = [];
        if (this.visible()) {
            var maxSize = base.project(-85, 180);
            if (!maxSize || maxSize[0] <= 0 || maxSize[1] <= 0) {
                maxSize = [base.width(), base.height()];
            }
            this._tile
                .size([Math.min(base.width(), maxSize[0]), Math.min(base.height(), maxSize[1])])
                .scale(base._zoom.scale() * (1 << 12))
                .translate(base._zoom.translate())
            ;
            tiles = this._tile();
            this._openStreetTransform
                .attr("transform", "scale(" + tiles.scale + ")translate(" + tiles.translate + ")")
            ;
        }
        if (this._prevTileProvider !== this.tileProvider()) {
            this._openStreet.selectAll("image").remove();
            this._prevTileProvider = this.tileProvider();
        }
        var context = this;
        var image = this._openStreet.selectAll("image").data(tiles, function (d) { return d[2] + "/" + d[0] + "/" + d[1]; });
        image.enter().append("image")
            .attr("xlink:href", function (d) {
                switch (context.tileProvider()) {
                    case "OpenStreetMap Hot":
                        return "http://" + ["a", "b", "c"][Math.random() * 3 | 0] + ".tile.openstreetmap.fr/hot/" + d[2] + "/" + d[0] + "/" + d[1] + ".png";
                    case "MapQuest":
                        return "http://otile" + ["1", "2", "3", "4"][Math.random() * 4 | 0] + ".mqcdn.com/tiles/1.0.0/osm/" + d[2] + "/" + d[0] + "/" + d[1] + ".png";
                    case "MapQuest Sat":
                        return "http://otile" + ["1", "2", "3", "4"][Math.random() * 4 | 0] + ".mqcdn.com/tiles/1.0.0/sat/" + d[2] + "/" + d[0] + "/" + d[1] + ".png";
                    case "Stamen Watercolor":
                        return "http://" + ["a", "b", "c"][Math.random() * 3 | 0] + ".tile.stamen.com/watercolor/" + d[2] + "/" + d[0] + "/" + d[1] + ".png";
                    case "OpenCycleMap":
                        return "http://" + ["a", "b"][Math.random() * 2 | 0] + ".tile.opencyclemap.org/cycle/" + d[2] + "/" + d[0] + "/" + d[1] + ".png";
                    default:
                        return "http://" + ["a", "b", "c"][Math.random() * 3 | 0] + ".tile.openstreetmap.org/" + d[2] + "/" + d[0] + "/" + d[1] + ".png";
                }
            })
            .attr("width", 1)
            .attr("height", 1)
            .attr("x", function (d) { return d[0]; })
            .attr("y", function (d) { return d[1]; })
            .style("opacity", 0.0)
            .transition().duration(500)
            .style("opacity", 1)
        ;
        image.exit()
            .remove()
        ;
    };

    return OpenStreet;
}));

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/TestHeatMap.js',["../layout/Layered", "../layout/AbsoluteSurface", "./ChoroplethStates", "../other/HeatMap"], factory);
    } else {
        root.map_TestHeatMap = factory(root.layout_Layered, root.layout_AbsoluteSurface, root.map_ChoroplethStates, root.other_HeatMap);
    }
}(this, function (Layered, AbsoluteSurface, ChoroplethStates, HeatMap) {
    function TestHeatMap(target) {
        Layered.call(this);
    }
    TestHeatMap.prototype = Object.create(Layered.prototype);
    TestHeatMap.prototype.constructor = TestHeatMap;
    TestHeatMap.prototype._class += " map_TestHeatMap";

    return TestHeatMap;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/TopoJSONChoropleth.js',["d3", "topojson", "./Choropleth", "require"], factory);
    } else {
        root.map_TopoJSONChoropleth = factory(root.d3, root.topojson, root.map_Choropleth, root.require);
    }
}(this, function (d3, topojson, Choropleth, require) {
    function TopoJSONChoropleth() {
        Choropleth.call(this);

        this.projection("mercator");
    }
    TopoJSONChoropleth.prototype = Object.create(Choropleth.prototype);
    TopoJSONChoropleth.prototype.constructor = TopoJSONChoropleth;
    TopoJSONChoropleth.prototype._class += " map_TopoJSONChoropleth";

    TopoJSONChoropleth.prototype.publish("region", "GB", "set", "Region Data", ["AT", "BE", "BG", "CHLI", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GB", "GE", "GR", "HR", "HU", "IE", "IS", "IT", "KS", "LT", "LU", "LV", "MD", "MK", "MT", "ND", "NL", "NO", "PL", "PT", "RO", "RS", "SE", "SI", "SK", "UA"]);

    TopoJSONChoropleth.prototype.layerEnter = function (base, svgElement, domElement) {
        Choropleth.prototype.layerEnter.apply(this, arguments);

        this._selection.widgetElement(this._choroplethData);
        this.choroPaths = d3.select(null);

        var context = this;
        this
            .tooltipHTML(function (d) {
                var columns = context.columns();
                var series = columns && columns.length ? columns[0] : "Location";
                var origData = d && d.length ? d[d.length - 1] : [""];
                return context.tooltipFormat({ label: origData[0], series: series, value: d[1] });
            })
        ;
    };

    TopoJSONChoropleth.prototype.layerUpdate = function (base) {
        var context = this;
        return new Promise(function (resolve, reject) {
            if (context._prevRegion !== context.region()) {
                context._prevRegion = context.region();
                require(["json!src/map/TopoJSON/" + context.region() + ".json"], function (region) {
                    context._choroTopology = region;
                    context._choroTopologyObjects = region.objects.PolbndA;
                    context._choroTopologyFeatures = topojson.feature(context._choroTopology, context._choroTopologyObjects).features;

                    require(["json!src/map/TopoJSON/" + context.region() + "_idx.json"], indexLoad, function (err) {
                        indexLoad({});
                    });
                    function indexLoad(index) {
                        context._choroTopologyIndex = index;
                        Choropleth.prototype.layerUpdate.call(context, base, true);
                        resolve();
                    }
                });
            } else {
                Choropleth.prototype.layerUpdate.call(context, base);
                resolve();
            }
        }).then(function () {
            var data = [];
            context.data().forEach(function (row) {
                if (isNaN(row[0])) {
                    for (var key in context._choroTopologyIndex) {
                        for (var key2 in context._choroTopologyIndex[key]) {
                            if (key2 === row[0]) {
                                context._choroTopologyIndex[key][key2].forEach(function (idx) {
                                    data.push([idx].concat(row.filter(function (d, i) { return i > 0; })).concat([row]));
                                });
                            }
                        }
                    }
                } else {
                    data.push(row.concat([row]));
                }
            });
            context.choroPaths = context._choroplethData.selectAll(".data").data(context.visible() ? data : [], function (d) { return d[0]; });
            context.choroPaths.enter().append("path")
                .attr("class", "data")
                .call(context._selection.enter.bind(context._selection))
                .on("click", function (d) {
                    if (context._dataMap[d[0]]) {
                        context.click(context.rowToObj(context._dataMap[d[0]]), "weight", context._selection.selected(context));
                    }
                })
                .on("dblclick", function (d) {
                    if (context._dataMap[d[0]]) {
                        context.dblclick(context.rowToObj(context._dataMap[d[0]]), "weight", context._selection.selected(context));
                    }
                })
                .on("mouseout.tooltip", context.tooltip.hide)
                .on("mousemove.tooltip", context.tooltip.show)
            ;
            context.choroPaths
                .attr("d", function (d) {
                    var retVal = base._d3GeoPath(context._choroTopologyFeatures[d[0]]);
                    if (!retVal) {
                        console.log("Unknown Country:  " + d);
                    }
                    return retVal;
                })
                .style("fill", function (d) {
                    var retVal = context._palette(d[1], context._dataMinWeight, context._dataMaxWeight);
                    return retVal;
                })
            ;
            context.choroPaths.exit().remove();
        });
    };

    return TopoJSONChoropleth;
}));