import { importLibrary } from "@googlemaps/js-api-loader";

const RESTAURANT_SEARCH_RADIUS_METERS = 900;
const MAX_RESTAURANT_ZONES = 6;
const MAX_RESTAURANTS_PER_ZONE = 20;
const EARTH_RADIUS_METERS = 6371000;
const SINGLE_PERSON_BOUNDS_RADIUS_METERS = 900;

let restaurantMarkers = [];

function normalizeLocations(locationsData) {
  if (!Array.isArray(locationsData)) {
    return [];
  }

  return locationsData
    .map((location) => ({
      ...location,
      COORDINATES: [
        Number(location?.COORDINATES?.[0]),
        Number(location?.COORDINATES?.[1]),
      ],
      SPACES: Number(location?.SPACES ?? 1),
    }))
    .filter(
      (location) =>
        Number.isFinite(location.COORDINATES[0]) &&
        Number.isFinite(location.COORDINATES[1]),
    );
}

function getCenterCoordinates(locationsData, mapCenter) {
  if (!locationsData.length) {
    return [mapCenter.lng, mapCenter.lat];
  }

  return [
    locationsData.reduce((sum, loc) => sum + loc.COORDINATES[0], 0) /
      locationsData.length,
    locationsData.reduce((sum, loc) => sum + loc.COORDINATES[1], 0) /
      locationsData.length,
  ];
}

function toLatLngLiteral(coordinates) {
  return {
    lng: coordinates[0],
    lat: coordinates[1],
  };
}

function getPlaceLatLngLiteral(location) {
  if (!location) {
    return null;
  }

  const lat = typeof location.lat === "function" ? location.lat() : location.lat;
  const lng = typeof location.lng === "function" ? location.lng() : location.lng;

  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return null;
  }

  return {
    lat: Number(lat),
    lng: Number(lng),
  };
}

function distanceMeters(first, second) {
  const firstLat = (first.lat * Math.PI) / 180;
  const secondLat = (second.lat * Math.PI) / 180;
  const latDifference = ((second.lat - first.lat) * Math.PI) / 180;
  const lngDifference = ((second.lng - first.lng) * Math.PI) / 180;
  const haversine =
    Math.sin(latDifference / 2) ** 2 +
    Math.cos(firstLat) *
      Math.cos(secondLat) *
      Math.sin(lngDifference / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function offsetLatLng(origin, northMeters, eastMeters) {
  const latOffset = (northMeters / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const lngOffset =
    (eastMeters /
      (EARTH_RADIUS_METERS * Math.cos((origin.lat * Math.PI) / 180))) *
    (180 / Math.PI);

  return {
    lat: origin.lat + latOffset,
    lng: origin.lng + lngOffset,
  };
}

function getPeopleBounds(locationsData) {
  const locations = normalizeLocations(locationsData);

  if (!locations.length) {
    return null;
  }

  if (locations.length === 1) {
    const center = toLatLngLiteral(locations[0].COORDINATES);
    const southWest = offsetLatLng(
      center,
      -SINGLE_PERSON_BOUNDS_RADIUS_METERS,
      -SINGLE_PERSON_BOUNDS_RADIUS_METERS,
    );
    const northEast = offsetLatLng(
      center,
      SINGLE_PERSON_BOUNDS_RADIUS_METERS,
      SINGLE_PERSON_BOUNDS_RADIUS_METERS,
    );

    return {
      north: northEast.lat,
      south: southWest.lat,
      east: northEast.lng,
      west: southWest.lng,
    };
  }

  return locations.reduce(
    (bounds, location) => {
      const [lng, lat] = location.COORDINATES;

      return {
        north: Math.max(bounds.north, lat),
        south: Math.min(bounds.south, lat),
        east: Math.max(bounds.east, lng),
        west: Math.min(bounds.west, lng),
      };
    },
    {
      north: -Infinity,
      south: Infinity,
      east: -Infinity,
      west: Infinity,
    },
  );
}

function isInsidePeopleBounds(location, bounds) {
  if (!bounds) {
    return true;
  }

  return (
    location.lat <= bounds.north &&
    location.lat >= bounds.south &&
    location.lng <= bounds.east &&
    location.lng >= bounds.west
  );
}

function buildRestaurantSearchZones(locationsData, mapCenter) {
  const locations = normalizeLocations(locationsData);
  const centerCoordinates = getCenterCoordinates(locations, mapCenter);
  const center = toLatLngLiteral(centerCoordinates);
  const zones = [
    {
      label: "centerpoint",
      center,
      distanceToCenter: 0,
      sortOrder: 0,
    },
  ];

  const peopleZones = locations
    .map((location, index) => {
      const zoneCenter = toLatLngLiteral(location.COORDINATES);

      return {
        label: location.Name
          ? `${location.Name}'s red zone`
          : `Person ${index + 1}'s red zone`,
        center: zoneCenter,
        distanceToCenter: distanceMeters(center, zoneCenter),
      };
    })
    .sort(
      (first, second) =>
        first.distanceToCenter - second.distanceToCenter ||
        first.label.localeCompare(second.label),
    )
    .map((zone, index) => ({
      ...zone,
      sortOrder: index + 1,
    }));

  for (const zone of peopleZones) {
    if (zones.length >= MAX_RESTAURANT_ZONES) {
      break;
    }

    const overlapsExistingZone = zones.some(
      (existingZone) =>
        existingZone.sortOrder > 0 &&
        distanceMeters(existingZone.center, zone.center) <
        RESTAURANT_SEARCH_RADIUS_METERS * 0.7,
    );

    if (!overlapsExistingZone) {
      zones.push(zone);
    }
  }

  return zones;
}

export function clearRestaurantMarkers() {
  restaurantMarkers.forEach((marker) => {
    marker.map = null;
  });
  restaurantMarkers = [];
}

export function clearRestaurantResults() {
  const sidebar = document.getElementById("restaurant-sidebar");
  const container = document.getElementById("restaurant-results");
  if (!container) {
    return;
  }

  container.replaceChildren();
  sidebar?.classList.remove("is-visible");
  sidebar?.setAttribute("aria-hidden", "true");
}

function showRestaurantStatus(message) {
  const sidebar = document.getElementById("restaurant-sidebar");
  const container = document.getElementById("restaurant-results");
  const status = document.createElement("div");
  status.className = "restaurant-status";
  status.textContent = message;
  container.replaceChildren(status);
  sidebar?.classList.add("is-visible");
  sidebar?.setAttribute("aria-hidden", "false");
}

function renderRestaurantResults(restaurants, zones) {
  const sidebar = document.getElementById("restaurant-sidebar");
  const container = document.getElementById("restaurant-results");
  const status = document.createElement("div");
  status.className = "restaurant-status";
  status.textContent = `${restaurants.length} restaurants found inside the people bounds`;

  if (!restaurants.length) {
    status.textContent = "No restaurants found inside the current people bounds";
    container.replaceChildren(status);
    sidebar?.classList.add("is-visible");
    sidebar?.setAttribute("aria-hidden", "false");
    return;
  }

  const list = document.createElement("ul");
  list.className = "restaurant-list";

  restaurants.forEach((restaurant) => {
    const item = document.createElement("li");
    item.className = "restaurant-item";

    const name = restaurant.url
      ? document.createElement("a")
      : document.createElement("span");
    name.className = "restaurant-name";
    name.textContent = restaurant.name;

    if (restaurant.url) {
      name.href = restaurant.url;
      name.target = "_blank";
      name.rel = "noreferrer";
    }

    const meta = document.createElement("div");
    meta.className = "restaurant-meta";
    meta.textContent = [
      restaurant.address,
      restaurant.rating,
      restaurant.closestZone,
    ]
      .filter(Boolean)
      .join(" - ");

    item.append(name, meta);
    list.appendChild(item);
  });

  container.replaceChildren(status, list);
  sidebar?.classList.add("is-visible");
  sidebar?.setAttribute("aria-hidden", "false");
}

function createInfoWindowContent(restaurant) {
  const content = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = restaurant.name;
  const address = document.createElement("div");
  address.textContent = restaurant.address || "";
  content.append(name, address);

  if (restaurant.url) {
    const link = document.createElement("a");
    link.href = restaurant.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Open in Google Maps";
    content.appendChild(link);
  }

  return content;
}

export async function findRestaurants({
  map,
  locationsData,
  fallbackLocationsData,
  mapCenter,
}) {
  const button = document.getElementById("find-restaurants");
  button.disabled = true;
  showRestaurantStatus("Finding restaurants near the red zones...");
  clearRestaurantMarkers();

  try {
    const searchLocations = locationsData?.length
      ? locationsData
      : fallbackLocationsData;
    const zones = buildRestaurantSearchZones(
      searchLocations,
      mapCenter,
    );
    const peopleBounds = getPeopleBounds(searchLocations);
    const [
      { Place, SearchNearbyRankPreference },
      { AdvancedMarkerElement },
      { InfoWindow },
    ] = await Promise.all([
      importLibrary("places"),
      importLibrary("marker"),
      importLibrary("maps"),
    ]);
    const restaurantsById = new Map();

    for (const zone of zones) {
      const { places } = await Place.searchNearby({
        fields: [
          "id",
          "displayName",
          "formattedAddress",
          "googleMapsURI",
          "location",
          "rating",
          "userRatingCount",
        ],
        locationRestriction: {
          center: zone.center,
          radius: RESTAURANT_SEARCH_RADIUS_METERS,
        },
        includedPrimaryTypes: ["restaurant"],
        maxResultCount: MAX_RESTAURANTS_PER_ZONE,
        rankPreference: SearchNearbyRankPreference.POPULARITY,
      });

      places.forEach((place) => {
        const location = getPlaceLatLngLiteral(place.location);
        if (!location || !isInsidePeopleBounds(location, peopleBounds)) {
          return;
        }

        const id =
          place.id ||
          `${place.displayName}-${location.lat.toFixed(6)}-${location.lng.toFixed(6)}`;
        const distanceToZone = distanceMeters(zone.center, location);
        const existingRestaurant = restaurantsById.get(id);
        const rating = place.rating
          ? `${place.rating.toFixed(1)} stars${
              place.userRatingCount ? ` (${place.userRatingCount})` : ""
            }`
          : "";

        if (
          !existingRestaurant ||
          zone.sortOrder < existingRestaurant.zoneSortOrder ||
          (zone.sortOrder === existingRestaurant.zoneSortOrder &&
            distanceToZone < existingRestaurant.distanceToZone)
        ) {
          restaurantsById.set(id, {
            id,
            name: place.displayName || "Unnamed restaurant",
            address: place.formattedAddress || "",
            url: place.googleMapsURI || "",
            location,
            rating,
            closestZone: zone.label,
            distanceToZone,
            zoneSortOrder: zone.sortOrder,
          });
        }
      });
    }

    const restaurants = Array.from(restaurantsById.values()).sort(
      (first, second) =>
        first.zoneSortOrder - second.zoneSortOrder ||
        first.distanceToZone - second.distanceToZone ||
        first.name.localeCompare(second.name),
    );
    const infoWindow = new InfoWindow();
    restaurantMarkers = restaurants.map((restaurant) => {
      const marker = new AdvancedMarkerElement({
        map,
        position: restaurant.location,
        title: restaurant.name,
      });

      marker.addListener("gmp-click", () => {
        infoWindow.setContent(createInfoWindowContent(restaurant));
        infoWindow.open({
          anchor: marker,
          map,
        });
      });

      return marker;
    });

    renderRestaurantResults(restaurants, zones);
  } catch (error) {
    console.error(error);
    showRestaurantStatus(
      "Could not find restaurants. Check that Places API is enabled for this key.",
    );
  } finally {
    button.disabled = false;
  }
}
