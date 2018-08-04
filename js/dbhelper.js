/**
 * Common database helper functions.
 */
class DBHelper {

  static get DATABASE_URL() {
    const port = 1337;
    return `${document.location.protocol}//${document.location.hostname}:${port}/restaurants`;
  }

  static async enableIDBstore() {
    if (!('indexedDB' in window)) {
      console.warn('No indexedDB capabilities detected.');
      return;
    }

    if (this.idb_instance) return;

    self.idb_instance = await idb.open(IDB_NAME, IDB_VER, upgradeDB => {
      if (!upgradeDB.objectStoreNames.contains(IDB_STORE)) {
        const idb_store = upgradeDB.createObjectStore(IDB_STORE, {keyPath: 'id'});
        idb_store.createIndex('cuisine', 'cuisine_type');
        idb_store.createIndex('location', 'neighborhood');
      }
    });
  }

  static async cacheDataInIDB(dataArray) {
    await this.enableIDBstore();
    const tx = self.idb_instance.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    for (const item of dataArray) {
      await store.put(item);
    }

    await tx.complete;
  }

  static fetchRestaurantsFromIDB(id=-1) {
    return this.enableIDBstore()
    .then(() => {
      const tx = self.idb_instance.transaction(IDB_STORE, 'read');
      const store = tx.objectStore(IDB_STORE);
      if (id !== -1) {
        return store.get(id);
      }
      return store.getAll();
    })
  }

  static fetchRestaurantsFromNet(id=-1) {
    return fetch(id !== -1 ? `${this.DATABASE_URL}/${id}` : this.DATABASE_URL)
    .then(response => {
      if (!response.ok) {
        throw Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      response.clone().json().then(json_data => {
        this.cacheDataInIDB(json_data);
      })
      return response;
    }) 
    .then(response => {
      return response.json();
    })
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants() {
    // return fetch(DBHelper.DATABASE_URL)
    //   .then(resp => {
    //     resp.clone().json().then(json_data => {
    //       this.cacheDataInIDB(json_data);
    //     })
    //     return resp;
    //   })
    //   .then(resp => {
    //     if (!resp.ok) {
    //       console.warn(`No response: ${resp.status} ${resp.statusText}`);
    //     } else {
    //       return resp.json();
    //     }
    //   })
    //   .catch(err => {
    //     throw `Request failed: ${err}`;
    //   });

    return this.fetchRestaurantsFromNet()
    .catch(err => {
      console.warn(err);
      return this.fetchRestaurantsFromIDB();
    });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id) {
    return fetch(`${DBHelper.DATABASE_URL}/${id}`)
      .then(resp => {
        if (!resp) {
          throw `No response: ${resp.status} ${resp.statusText}`;
        } else {
            return resp.json();
        }
      })
      .catch(err => {
        throw `Request failed: ${err}`;
      });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine) {
    // Fetch all restaurants  with proper error handling
    return DBHelper.fetchRestaurants()
      .then (restaurants => restaurants.filter(r => r.cuisine_type == cuisine));
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood) {
    return DBHelper.fetchRestaurants()
      .then(restaurants => restaurants.filter(r => r.neighborhood == neighborhood));
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    return DBHelper.fetchRestaurants()
      .then(restaurants => {
        let results = restaurants;

        if (cuisine != 'all') {
          results = results.filter(r => r.cuisine_type == cuisine);
        }

        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }

        return results;
      });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods() {
    return DBHelper.fetchRestaurants()
      .then(restaurants => {
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
        return uniqueNeighborhoods;
      });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines() {
    return DBHelper.fetchRestaurants()
      .then(restaurants => {
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
        return uniqueCuisines;
      });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant, size="medium") {
    return (`/assets/images/${restaurant.photograph}-${size}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

}
