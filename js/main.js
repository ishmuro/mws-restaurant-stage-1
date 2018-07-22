let restaurants,
  neighborhoods,
  cuisines;
var map;
var markers = [];

var db;

const IDB_VER = 1;
const IDB_NAME = 'restaurant-review';
const IDB_STORE = 'restaurants';

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker();
  fetchNeighborhoods();
  registerIDB();
  fetchCuisines();
});

/**
 * Register a service worker for offline capabilities.
 */
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service_worker.js', {scope: '/'})
    .then((reg) => {console.log(`Service worker OK. Scope is ${reg.scope}`)})
    .catch((error) => {console.log(`Service worker registration failed: ${error}`)});
  } else {
    console.warn('No serviceWorker capabilities detected.');
  }
};

const registerIDB = async () => {
  if (!('indexedDB' in window)) {
    console.warn('No indexedDB capabilities detected.');
    return;
  }

  self.db = await idb.open(IDB_NAME, IDB_VER, upgradeDB => {
    if (!upgradeDB.objectStoreNames.contains(IDB_STORE)) {
      upgradeDB.createObjectStore(IDB_STORE, {keyPath: 'id'});
    }
  });
};

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = async () => {
  self.neighborhoods = await DBHelper.fetchNeighborhoods();
  fillNeighborhoodsHTML();
};

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  for (const neighborhood of neighborhoods) {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    option.setAttribute('role', 'option');
    select.append(option);
  }
};

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = async () => {
  self.cuisines = await DBHelper.fetchCuisines();
  fillCuisinesHTML();
};

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  for (const cuisine of cuisines) {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  }
};

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();

  // We do not need to have Google maps stuff in tabindex

  google.maps.event.addListener(self.map, "tilesloaded", () => {
    let links = document.querySelectorAll('#map a');
    for (link of links) {
      link.setAttribute('tabindex', '-1');
    }
  });
};

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = async () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  const restaurants = await DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood);
  resetRestaurants(restaurants);
  fillRestaurantsHTML();
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  for (const restaurant of restaurants) {
    ul.append(createRestaurantHTML(restaurant));
  }
  addMarkersToMap();
};

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant, 'small');
  image.alt = `Interior of ${restaurant.name} restaurant`;
  li.append(image);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);

  return li;
};

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  for (const restaurant of restaurants) {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  }
};
