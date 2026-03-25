/* eslint-disable @typescript-eslint/no-explicit-any */
declare namespace kakao.maps {
  function load(callback: () => void): void;

  class Map {
    constructor(container: HTMLElement, options: { center: LatLng; level: number });
    setCenter(latlng: LatLng): void;
    setBounds(bounds: LatLngBounds): void;
  }

  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class LatLngBounds {
    constructor();
    extend(latlng: LatLng): void;
  }

  class Marker {
    constructor(options: { map?: Map; position: LatLng; title?: string });
    setMap(map: Map | null): void;
  }

  class InfoWindow {
    constructor(options: { content: string; removable?: boolean });
    open(map: Map, marker: Marker): void;
    close(): void;
  }

  namespace event {
    function addListener(target: any, type: string, handler: () => void): void;
  }

  namespace services {
    class Places {
      keywordSearch(
        keyword: string,
        callback: (result: PlaceSearchResult[], status: string) => void,
      ): void;
    }

    interface PlaceSearchResult {
      id: string;
      place_name: string;
      address_name: string;
      road_address_name: string;
      category_name: string;
      x: string; // longitude
      y: string; // latitude
    }

    enum Status {
      OK = "OK",
      ZERO_RESULT = "ZERO_RESULT",
      ERROR = "ERROR",
    }
  }
}
