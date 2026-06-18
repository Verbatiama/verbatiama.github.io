import { importLibrary } from "@googlemaps/js-api-loader";

const RESTAURANT_SEARCH_RADIUS_METERS = 900;
const HOT_ZONE_CLUSTER_RADIUS_METERS = 900;
const MAX_RESTAURANT_ZONES = 6;
const MAX_RESTAURANTS_PER_ZONE = 20;
const EARTH_RADIUS_METERS = 6371000;

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

function buildRestaurantSearchZones(locationsData, mapCenter) {
  const locations = normalizeLocations(locationsData);
  const centerCoordinates = getCenterCoordinates(locations, mapCenter);
  const center = toLatLngLiteral(centerCoordinates);
  const zones = [
    {
      label: "centerpoint",
      center,
      priority: locations.length + 1,
    },
  ];

  const hotZones = locations
    .map((location) => {
      const zoneCenter = toLatLngLiteral(location.COORDINATES);
      const nearbyPeople = locations.filter((otherLocation) => {
        const otherCenter = toLatLngLiteral(otherLocation.COORDINATES);
        return (
          distanceMeters(zoneCenter, otherCenter) <= HOT_ZONE_CLUSTER_RADIUS_METERS
        );
      }).length;

      return {
        label: location.Name ? `${location.Name}'s red zone` : "friend red zone",
        center: zoneCenter,
        priority: nearbyPeople,
      };
    })
    .sort((first, second) => second.priority - first.priority);

  for (const zone of hotZones) {
    if (zones.length >= MAX_RESTAURANT_ZONES) {
      break;
    }

    const overlapsExistingZone = zones.some(
      (existingZone) =>
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
  const container = document.getElementById("restaurant-results");
  if (!container) {
    return;
  }

  container.replaceChildren();
  container.classList.remove("is-visible");
}

function showRestaurantStatus(message) {
  const container = document.getElementById("restaurant-results");
  const status = document.createElement("div");
  status.className = "restaurant-status";
  status.textContent = message;
  container.replaceChildren(status);
  container.classList.add("is-visible");
}

function renderRestaurantResults(restaurants, zones) {
  const container = document.getElementById("restaurant-results");
  const status = document.createElement("div");
  status.className = "restaurant-status";
  status.textContent = `${restaurants.length} restaurants found near ${zones.length} meetup zones`;

  if (!restaurants.length) {
    status.textContent = "No restaurants found near the current meetup zones";
    container.replaceChildren(status);
    container.classList.add("is-visible");
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
  container.classList.add("is-visible");
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
    const zones = buildRestaurantSearchZones(
      locationsData?.length ? locationsData : fallbackLocationsData,
      mapCenter,
    );
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
        if (!location) {
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
          distanceToZone < existingRestaurant.distanceToZone
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
          });
        }
      });
    }

    const restaurants = Array.from(restaurantsById.values()).sort(
      (first, second) =>
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
