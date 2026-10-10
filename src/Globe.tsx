import { useEffect, useRef, useState } from "react";
import mapboxgl, { type Map as MapboxMap, type Marker } from "mapbox-gl";
import { journeys, type Journey, type Card } from "./content";
import {
  OPENING_ROUTE_DRAW_MS,
  OPENING_ROUTE_STAGGER_MS,
  openingRouteData,
  tracedOpeningLines,
  type OpeningStage,
} from "./opening";
import {
  angularDistance,
  markerGroups,
  positionOf,
  routeFeatures,
} from "./geography";

type Props = {
  journey: Journey | null;
  activeCard: Card | null;
  mode: "browse" | "journey";
  onSelectCard: (id: string) => void;
  recenterKey: number;
  onStatus: (status: "ready" | "missing" | "error" | "loading") => void;
  introStage: OpeningStage;
};
const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const openingRoutes = openingRouteData(journeys);
const introLineLayer = "opening-route-dots";
const introPointLayer = "opening-route-endpoints";

function removeOpeningLayers(map: MapboxMap) {
  if (map.getLayer(introPointLayer)) map.removeLayer(introPointLayer);
  if (map.getLayer(introLineLayer)) map.removeLayer(introLineLayer);
  if (map.getSource("opening-points")) map.removeSource("opening-points");
  if (map.getSource("opening-lines")) map.removeSource("opening-lines");
}

function setOpeningRouteOpacity(map: MapboxMap, opacity: number) {
  if (map.getLayer(introLineLayer))
    map.setPaintProperty(introLineLayer, "line-opacity", opacity);
  if (map.getLayer(introPointLayer))
    map.setPaintProperty(introPointLayer, "circle-opacity", opacity);
}

function installOpeningLayers(map: MapboxMap) {
  if (!map.getSource("opening-lines"))
    map.addSource("opening-lines", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  if (!map.getSource("opening-points"))
    map.addSource("opening-points", { type: "geojson", data: openingRoutes.points });
  if (!map.getLayer(introLineLayer)) map.addLayer({
      id: introLineLayer,
      type: "line",
      source: "opening-lines",
      layout: { "line-cap": "round" },
      paint: {
        "line-color": "#e67a48",
        "line-width": 2.8,
        "line-dasharray": [0.65, 2.2],
        "line-opacity": 1,
        "line-opacity-transition": { duration: 500 },
      },
    });
  if (!map.getLayer(introPointLayer))
    map.addLayer({
      id: introPointLayer,
      type: "circle",
      source: "opening-points",
      paint: {
        "circle-color": "#e67a48",
        "circle-radius": 3.7,
        "circle-opacity": 1,
        "circle-opacity-transition": { duration: 500 },
      },
    });
}

function focusZoom(mobile: boolean) {
  const tenPercentLarger = Math.log2(1.1);
  if (mobile) return 1.65 + tenPercentLarger;
  const width = window.innerWidth;
  const storyRight =
    width <= 1000
      ? 389
      : Math.min(82, Math.max(24, width * 0.048)) + Math.min(398, width * 0.36);
  const availableWidth = width - storyRight - 40;
  const baseZoom = Math.max(
    0.75,
    Math.min(1.85, 1.85 + Math.log2(availableWidth / 650)),
  );
  return baseZoom + tenPercentLarger;
}

function configureStyle(map: MapboxMap) {
  map.setProjection("globe");
  map.setFog({
    color: "#557179",
    "high-color": "#172f35",
    "horizon-blend": 0.035,
    "space-color": "#172f35",
    "star-intensity": 0,
  });
  const layers = map.getStyle().layers ?? [];
  for (const layer of layers) {
    const id = layer.id.toLowerCase();
    if (id.startsWith("atlas-graticule") || id.startsWith("route-") || id.startsWith("opening-"))
      continue;
    if (layer.type === "background") {
      map.setPaintProperty(layer.id, "background-color", "#d7d9ca");
    } else if (layer.type === "fill" && /water|ocean|sea/.test(id)) {
      map.setPaintProperty(layer.id, "fill-color", "#365961");
      map.setPaintProperty(layer.id, "fill-opacity", 1);
    } else if (layer.type === "fill" && /land/.test(id)) {
      map.setPaintProperty(layer.id, "fill-color", "#d7d9ca");
    } else {
      map.setLayoutProperty(layer.id, "visibility", "none");
    }
  }
  if (!map.getSource("atlas-graticule")) {
    const features: Array<{
      type: "Feature";
      geometry: { type: "LineString"; coordinates: number[][] };
      properties: Record<string, never>;
    }> = [];
    for (const lat of [-60, -30, 0, 30, 60])
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: Array.from({ length: 73 }, (_, i) => [
            -180 + i * 5,
            lat,
          ]),
        },
        properties: {},
      });
    for (let lon = -180; lon <= 150; lon += 30)
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: Array.from({ length: 35 }, (_, i) => [lon, -85 + i * 5]),
        },
        properties: {},
      });
    map.addSource("atlas-graticule", {
      type: "geojson",
      data: { type: "FeatureCollection", features },
    });
    map.addLayer({
      id: "atlas-graticule-line",
      type: "line",
      source: "atlas-graticule",
      paint: {
        "line-color": "#d4ddd1",
        "line-width": 0.55,
        "line-opacity": 0.15,
      },
    });
  }
  if (!map.getSource("journey-routes"))
    map.addSource("journey-routes", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  if (!map.getLayer("route-solid"))
    map.addLayer({
      id: "route-solid",
      type: "line",
      source: "journey-routes",
      filter: ["!=", ["get", "rendering"], "dashed"],
      paint: {
        "line-color": "#a76543",
        "line-width": ["case", ["==", ["get", "active"], 1], 2.3, 1.1],
        "line-opacity": ["case", ["==", ["get", "active"], 1], 0.88, 0.32],
      },
    });
  if (!map.getLayer("route-dashed"))
    map.addLayer({
      id: "route-dashed",
      type: "line",
      source: "journey-routes",
      filter: ["==", ["get", "rendering"], "dashed"],
      paint: {
        "line-color": "#a76543",
        "line-width": ["case", ["==", ["get", "active"], 1], 2, 1],
        "line-opacity": ["case", ["==", ["get", "active"], 1], 0.8, 0.3],
        "line-dasharray": [2, 3],
      },
    });
}

export default function Globe({
  journey,
  activeCard,
  mode,
  onSelectCard,
  recenterKey,
  onStatus,
  introStage,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const introRouteFrame = useRef<number | null>(null);
  const introRouteStart = useRef<number | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const selectRef = useRef(onSelectCard);
  const statusRef = useRef(onStatus);
  const [ready, setReady] = useState(false);
  const userInteracted = useRef(false);
  const reduceMotion = useRef(
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    selectRef.current = onSelectCard;
  }, [onSelectCard]);
  useEffect(() => {
    statusRef.current = onStatus;
  }, [onStatus]);

  useEffect(() => {
    if (!token || token.startsWith("pk.your_")) {
      statusRef.current("missing");
      return;
    }
    if (!container.current || !mapboxgl.supported()) {
      statusRef.current("error");
      return;
    }
    mapboxgl.accessToken = token;
    let map: MapboxMap;
    try {
      map = new mapboxgl.Map({
        container: container.current,
        style:
          import.meta.env.VITE_MAPBOX_STYLE_URL ||
          "mapbox://styles/mapbox/light-v11",
        projection: "globe",
        center: [25, 21],
        zoom: 1.65,
        minZoom: 0.75,
        maxZoom: 3.2,
        pitch: 0,
        bearing: 0,
        dragRotate: false,
        attributionControl: true,
      });
    } catch {
      statusRef.current("error");
      return;
    }
    mapRef.current = map;
    statusRef.current("loading");
    let cancelled = false;
    const styleLoaded = () => {
      if (cancelled) return;
      try {
        configureStyle(map);
        setReady(true);
        statusRef.current("ready");
      } catch {
        statusRef.current("error");
      }
    };
    map.on("style.load", styleLoaded);
    map.on("error", (event) => {
      if (
        !cancelled &&
        !map.loaded() &&
        /401|403|access token|unauthorized|forbidden/i.test(
          String(event.error?.message),
        )
      )
        statusRef.current("error");
    });
    const stopForUser = () => {
      userInteracted.current = true;
      map.stop();
    };
    const canvas = map.getCanvas();
    canvas.addEventListener("pointerdown", stopForUser);
    canvas.addEventListener("wheel", stopForUser, { passive: true });
    return () => {
      cancelled = true;
      if (introRouteFrame.current !== null)
        window.cancelAnimationFrame(introRouteFrame.current);
      introRouteFrame.current = null;
      introRouteStart.current = null;
      canvas.removeEventListener("pointerdown", stopForUser);
      canvas.removeEventListener("wheel", stopForUser);
      popupRef.current?.remove();
      markersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource("journey-routes") as
      mapboxgl.GeoJSONSource | undefined;
    source?.setData(
      journey
        ? routeFeatures(journey.cards, journey.edges, activeCard?.id ?? "")
        : { type: "FeatureCollection", features: [] },
    );
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    popupRef.current?.remove();
    if (!journey || mode === "browse") return;
    const groups = markerGroups(journey.cards);
    const updateVisibility = () => {
      const center: [number, number] = [
        map.getCenter().lng,
        map.getCenter().lat,
      ];
      for (const marker of markersRef.current) {
        const lnglat = marker.getLngLat();
        const visible = angularDistance(center, [lnglat.lng, lnglat.lat]) < 91;
        const element = marker.getElement();
        element.style.visibility = visible ? "visible" : "hidden";
        element.style.pointerEvents = visible ? "auto" : "none";
      }
    };
    for (const group of groups) {
      const lead = group[0];
      const element = document.createElement("button");
      element.type = "button";
      element.className = `map-pin${group.some((c) => c.id === activeCard?.id) ? " is-active" : ""}${lead.location.precision.includes("regional") ? " is-regional" : ""}`;
      element.innerHTML = `<span class="pin-core"></span><span class="pin-word"></span>`;
      element.querySelector(".pin-word")!.textContent =
        group.length > 1 ? `${group.length} chapters` : lead.spelling;
      element.setAttribute(
        "aria-label",
        group.length > 1
          ? `${group.length} chapters near ${lead.location.label}; choose a chapter`
          : `Open ${lead.spelling}, ${lead.location.label}`,
      );
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        if (group.length === 1) {
          selectRef.current(lead.id);
          return;
        }
        popupRef.current?.remove();
        const list = document.createElement("div");
        list.className = "pin-chooser";
        const title = document.createElement("strong");
        title.textContent = lead.location.label;
        list.append(title);
        for (const card of group) {
          const item = document.createElement("button");
          item.type = "button";
          item.textContent = `${card.spelling} · ${card.language}`;
          item.addEventListener("click", () => {
            selectRef.current(card.id);
            popupRef.current?.remove();
          });
          list.append(item);
        }
        popupRef.current = new mapboxgl.Popup({
          offset: 20,
          closeButton: true,
          closeOnClick: false,
        })
          .setLngLat(positionOf(lead))
          .setDOMContent(list)
          .addTo(map);
        (list.querySelector("button") as HTMLButtonElement)?.focus();
      });
      markersRef.current.push(
        new mapboxgl.Marker({
          element,
          anchor: "left",
          offset: [-15, 0],
          occludedOpacity: 0,
        })
          .setLngLat(positionOf(lead))
          .addTo(map),
      );
      element.setAttribute("role", "button");
    }
    map.on("move", updateVisibility);
    updateVisibility();
    return () => {
      map.off("move", updateVisibility);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      popupRef.current?.remove();
    };
  }, [journey, activeCard, mode, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.resize();
    map.stop();
    if (!activeCard || mode === "browse") return;
    const isMobile = window.matchMedia("(max-width: 700px)").matches;
    map.easeTo({
      center: positionOf(activeCard),
      zoom: focusZoom(isMobile),
      offset: isMobile ? [0, -window.innerHeight * 0.29] : [0, 0],
      duration: reduceMotion.current ? 0 : 850,
      essential: true,
    });
  }, [activeCard, mode, ready, recenterKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (introStage === "globe" && !reduceMotion.current) {
      map.stop();
      map.easeTo({
        center: [19, 27],
        zoom: 1.78,
        bearing: 8,
        duration: 3200,
        easing: (t) => 1 - Math.pow(1 - t, 3),
        essential: true,
      });
    } else if (
      introStage === "reveal" ||
      introStage === "fallback" ||
      introStage === "reduced"
    ) {
      map.stop();
    }
  }, [introStage, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const visible = ["globe", "mark", "wordmark", "hold"].includes(introStage);
    if (visible) {
      installOpeningLayers(map);
      setOpeningRouteOpacity(map, 1);
      if (
        introStage === "globe" &&
        introRouteStart.current === null &&
        introRouteFrame.current === null
      ) {
        let lastUpdate = -Infinity;
        const trace = (time: number) => {
          if (introRouteStart.current === null) introRouteStart.current = time;
          const elapsed = time - introRouteStart.current;
          const duration = (openingRoutes.lines.features.length - 1) *
            OPENING_ROUTE_STAGGER_MS + OPENING_ROUTE_DRAW_MS;
          if (elapsed - lastUpdate >= 32 || elapsed >= duration) {
            const source = map.getSource("opening-lines") as mapboxgl.GeoJSONSource | undefined;
            source?.setData(tracedOpeningLines(openingRoutes.lines, elapsed));
            lastUpdate = elapsed;
          }
          if (elapsed < duration)
            introRouteFrame.current = window.requestAnimationFrame(trace);
          else introRouteFrame.current = null;
        };
        introRouteFrame.current = window.requestAnimationFrame(trace);
      }
    } else {
      if (introRouteFrame.current !== null)
        window.cancelAnimationFrame(introRouteFrame.current);
      introRouteFrame.current = null;
      introRouteStart.current = null;
      if (introStage === "reveal") setOpeningRouteOpacity(map, 0);
      else removeOpeningLayers(map);
    }
  }, [introStage, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const resize = () => {
      map.resize();
      if (mode !== "journey" || !activeCard) return;
      const mobile = window.matchMedia("(max-width: 700px)").matches;
      map.easeTo({
        center: positionOf(activeCard),
        zoom: focusZoom(mobile),
        offset: mobile ? [0, -window.innerHeight * 0.29] : [0, 0],
        duration: 0,
      });
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [activeCard, mode, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || mode !== "browse" || reduceMotion.current || introStage !== "complete") return;
    userInteracted.current = false;
    const drift = () => {
      if (document.hidden || userInteracted.current || map.isMoving()) return;
      const c = map.getCenter();
      map.easeTo({
        center: [c.lng - 1.8, c.lat],
        duration: 1700,
        easing: (n) => n,
      });
    };
    const timer = window.setInterval(drift, 1900);
    return () => window.clearInterval(timer);
  }, [ready, mode, introStage]);

  return (
    <div
      className="globe-layer"
      aria-hidden={mode === "browse" ? "true" : undefined}
    >
      <div ref={container} className="map-container" />
      <div className={`globe-veil ${mode === "browse" ? "is-dim" : ""}${["globe", "mark", "wordmark", "hold"].includes(introStage) ? " is-intro" : ""}`} />
    </div>
  );
}
