'use strict';

import Leaflet from 'leaflet';
import React from 'react';
import { compose, extend } from 'stampit';
require('leaflet.markercluster');

import leafletLayer from './lib/leafletLayer';
import MarkerPopup from './MarkerPopup';

let markerCluster = compose(leafletLayer).methods({
  componentWillMount() {
    this.leafletElement = Leaflet.markerClusterGroup();
  },

  componentWillReceiveProps(nextProps) {
    // add markers to cluster layer
    if (nextProps.newMarkerData.length > 0) {
      let markers = Object.assign({}, this.props.markers);
      let newMarkers = [];

      nextProps.newMarkerData.forEach((obj) => {
        let markerPopup = React.renderToStaticMarkup(
          <MarkerPopup
            caption={obj.caption}
            imgUrl={obj.imgUrl}
            profileUrl={obj.profileUrl}
          />
        );

        let leafletMarker = Leaflet.marker(obj.latLng)
          .bindPopup(markerPopup, {maxHeight: 350, maxWidth: 250, minWidth: 250})
          .on('click', () => this.props.map.panTo(obj.latLng));

        markers[obj.id] = leafletMarker;
        newMarkers.push(leafletMarker);
      });

      this.leafletElement.addLayers(newMarkers);

      setTimeout(() => {
        this.props.updateMarkers(markers);
      }, 0);
    }

    // zoom to particular marker
    if (Object.keys(nextProps.focusMarker).length > 0) {
      let marker = this.props.markers[nextProps.focusMarker.id];

      this.leafletElement.zoomToShowLayer(marker, () => {
        this.props.map.panTo(nextProps.focusMarker.latLng);
        marker.openPopup();
      });
    }
  },

  shouldComponentUpdate() {
    return false;
  },

  render() {
    return null;
  },
});

export default extend(markerCluster, {
  propTypes: {
    focusMarker: React.PropTypes.object,
    markers: React.PropTypes.object,
    newMarkerData: React.PropTypes.array,
    updateMarkers: React.PropTypes.func,
  },

  defaultProps: {
    markers: {},
    newMarkerData: [],
    focusMarker: {},
  },
});
