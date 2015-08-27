/* global L */

// Enumeration of all possible clickable HTML elements for each layer group.
var LayerControlAction = {
  ToggleDisplay: 1,
  ToggleLabels: 2,
  SelectLayer: 3
};

// Since each table row in the layer control is a single LayerControlGroup rather than a layer,
// all the HTML elements are associated with a group rather than an item.
// options:
//    display: show, hide, checked, unchecked, map (default)
//    labels: show, hide, checked, unchecked (default)
function LayerControlGroup(layers, name, options)
{
  options = options || [];
  options.display = options.display || "show";
  options.label = options.label || "unchecked";

  // Convert single layer to array if necessary
  if (!(layers && layers.constructor === Array)) { layers = [layers]; }

  this.layers = layers;
  this.name = name;

  // Assign group name to every layer. 
  // Note: This means a layer can only appear in a single group.
  for (var i in layers)
  {
    this.layers[i].groupName = name;
  }

  // Toggle the display icon
  this.setDisplay = function (checked)
  {
    if (this.displayElement)
    {
      if (checked) {
        this.displayElement.classList.add('leaflet-control-display-checked');
        this.displayElement.classList.remove('leaflet-control-display-unchecked');
      } else {
        this.displayElement.classList.remove('leaflet-control-display-checked');
        this.displayElement.classList.add('leaflet-control-display-unchecked');
      }
      //this.displayElement.src = checked ? "../img/display.png" : "../img/display_gray.png";
    }
  };

  // Get the display icon state
  this.getDisplay = function ()
  {
    // default is true (for base layers)
    return !this.displayElement || this.displayElement.classList.contains("leaflet-control-display-checked");
  }

  // Toggle the label icon
  this.setLabeled = function (checked)
  {
    if (this.labelElement)
    {
      if (checked)
      {
        this.labelElement.classList.add('leaflet-control-label-checked');
        this.labelElement.classList.remove('leaflet-control-label-unchecked');
      } else
      {
        this.labelElement.classList.remove('leaflet-control-label-checked');
        this.labelElement.classList.add('leaflet-control-label-unchecked');
      }
      //this.labelElement.src = checked ? "../img/label.png" : "../img/label_gray.png";
    }
  };

  // Get the label icon state
  this.getLabeled = function ()
  {
    return !this.labelElement || this.labelElement.classList.contains("leaflet-control-label-checked");
  };

  // Get the selected layer for this group.
  this.getSelectedLayer = function ()
  {
    if (this.layers.length === 1) { return this.layers[0]; }
    if (this.selectElement)
    {
      var layerName = this.selectElement.options[this.selectElement.selectedIndex].value;
      var layer = this._getLayerByName(layerName);
      return layer;
    }
    return null;
  };

  this.setSelectedLayer = function (layer)
  {
    if (this.selectElement) {
      var index = this.layers.indexOf(layer);
      if (index >= 0)
      {
        this.selectElement.options[index].selected = true;
      }
    }
  };

  // Create the display element
  if (options.display !== "hide")
  {
    this.displayElement = document.createElement("div");
    this.displayElement.LayerControlAction = LayerControlAction.ToggleDisplay;
    this.displayElement.groupName = this.name;
    this.setDisplay(false);
  }

  // Create the label element
  if (options.label !== "hide")
  {
    this.labelElement = document.createElement("div");
    this.labelElement.LayerControlAction = LayerControlAction.ToggleLabels;
    this.labelElement.groupName = this.name;
    this.setLabeled(options.label === "checked");
  }

  // Create the name element
  this.nameElement = document.createElement('span');
  this.nameElement.innerHTML = ' ' + this.name;
  this.nameElement.groupName = this.name;

  // Create the select element
  if (layers && layers.constructor === Array && layers.length > 1)
  {
    // IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see http://bit.ly/PqYLBe)
    // NOTE: Opening the select element and displaying the options list fires the select.onmouseout event which 
    // propagates to the div container and collapses the layer control. The onmouseout handler below will
    // stop this event from propagating. It has an if-else clause because IE handles this differently than other browsers.
    var selectHtml = '<select class="leaflet-control-layers-selector" onmouseout="if (arguments[0]) {arguments[0].stopPropagation();} else {window.event.cancelBubble();}">';
    for (var i = 0; i < this.layers.length; i++)
    {
      selectHtml += '<option value="' + this.layers[i].options.name + '">' + this.layers[i].options.name + "</option>";
    }
    selectHtml += '</select>';

    var selectFragment = document.createElement('div');
    selectFragment.innerHTML = selectHtml;
    selectFragment.firstChild.LayerControlAction = LayerControlAction.SelectLayer;
    selectFragment.firstChild.groupName = this.name;
    this.selectElement = selectFragment.firstChild;
  }

  // Find a layer by its name.
  this._getLayerByName = function (name)
  {
    var matches = this.layers.filter(function (element) { return element.options.name === name; });
    return (matches.length > 0) ? matches[0] : null;
  };

  // Return true if any layer in this group is visible.
  this._anyLayerVisible = function (map)
  {
    return this.layers.filter(function (layer) { return map.hasLayer(layer); }).length > 0;
  };

  // Toggle the display icon based on map state.
  this.init = function (map) {
    var visibleLayers = this.layers.filter(function (layer) { return map.hasLayer(layer); });
    this.setDisplay(visibleLayers.length > 0);
    if (visibleLayers.length > 0) this.setSelectedLayer(visibleLayers[0]);
  };
}


// A layer control which provides for layer groupings.
// Author: Ishmael Smyrnow
// Revised: Matthew Katinsky
L.Control.GroupedLayers = L.Control.extend({
  options: {
    collapsed: true,
    position: 'topright',
    autoZIndex: true,
    labelCallback: null
  },

  initialize: function (layerControlGroups, options)
  {
    var i, j, group;
    L.Util.setOptions(this, options);

    this._layers = {};
    this._groups = layerControlGroups;
    this._lastZIndex = 0;
    this._handlingClick = false;

    for (i in this._groups)
    {
      group = this._groups[i];
      for (j in group.layers)
      {
        this._addLayer(group.layers[j]);
      }
    }
  },

  _getGroupByName: function (name)
  {
    var groups = this._groups.filter(function (g) { return g.name === name; });
    return (groups.length > 0) ? groups[0] : null;
  },

  _addLayer: function (layer)
  {
    var id = L.Util.stamp(layer);

    this._layers[id] = layer;

    if (this.options.autoZIndex)
    {
      if (layer.setZIndex)
      {
        this._lastZIndex++;
        layer.setZIndex(this._lastZIndex);
      }
    }
  },

  onAdd: function (map)
  {
    this._initLayout();
    this._update();

    map
      .on('layeradd', this._onLayerChange, this)
      .on('layerremove', this._onLayerChange, this);

    return this._container;
  },

  onRemove: function (map)
  {
    map
      .off('layeradd', this._onLayerChange)
      .off('layerremove', this._onLayerChange);
  },

  _initLayout: function ()
  {
    var className = 'leaflet-control-layers',
      container = this._container = L.DomUtil.create('div', className);

    //Makes this work on IE10 Touch devices by stopping it from firing a mouseout event when the touch is released
    container.setAttribute('aria-haspopup', true);

    if (!L.Browser.touch)
    {
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(container, 'wheel', L.DomEvent.stopPropagation);
    } else
    {
      L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
    }

    var form = this._form = L.DomUtil.create('form', className + '-list');

    if (this.options.collapsed)
    {
      if (!L.Browser.android)
      {
        L.DomEvent
          .on(container, 'mouseover', this._expand, this)
          .on(container, 'mouseout', this._collapse, this);
      }
      var link = this._layersLink = L.DomUtil.create('a', className + '-toggle', container);
      link.href = '#';
      link.title = 'Layers';

      if (L.Browser.touch)
      {
        L.DomEvent
          .on(link, 'click', L.DomEvent.stop)
          .on(link, 'click', this._expand, this);
      } else
      {
        L.DomEvent.on(link, 'focus', this._expand, this);
      }

      this._map.on('click', this._collapse, this);
      // TODO keyboard accessibility
    } else
    {
      this._expand();
    }

    this._groupTable = L.DomUtil.create('table', className + '-overlays', form);

    container.appendChild(form);
  },

  _update: function ()
  {
    if (!this._container)
    {
      return;
    };
    this._groupTable.innerHTML = '';

    for (var i in this._groups)
    {
      this._addGroup(this._groups[i]);
    }
  },

  _onLayerChange: function (e)
  {
    var obj = this._layers[L.Util.stamp(e.layer)];

    if (!obj) { return; }

    if (!this._handlingClick)
    {
      this._update();
    }

    var group = this._getGroupByName(obj.groupName);
    var base = group && !group.displayElement;

    var type = !base ?
      (e.type === 'layeradd' ? 'overlayadd' : 'overlayremove') :
      (e.type === 'layeradd' ? 'baselayerchange' : null);

    if (type)
    {
      this._map.fire(type, obj);
    }
  },

  _addGroup: function (group)
  {
    group.init(this._map);

    var tr, td;

    tr = document.createElement('tr');

    td = document.createElement('td');
    if (group.displayElement)
    {
      L.DomEvent.on(group.displayElement, 'click', this._onLayerControlAction, this);
      td.appendChild(group.displayElement);
    } else
    {
      td.innerHTML = "&nbsp;";
    }
    tr.appendChild(td);

    td = document.createElement('td');
    if (group.labelElement)
    {
      L.DomEvent.on(group.labelElement, 'click', this._onLayerControlAction, this);
      td.appendChild(group.labelElement);
    } else
    {
      td.innerHTML = "&nbsp;";
    }
    tr.appendChild(td);

    td = document.createElement('td');
    td.appendChild(group.nameElement);
    if (group.selectElement)
    {
      L.DomEvent.on(group.selectElement, 'change', this._onLayerControlAction, this);
      td.appendChild(group.selectElement);
    }
    tr.appendChild(td);

    this._groupTable.appendChild(tr);

    return tr;
  },

  _onLayerControlAction: function (evt)
  {
    var i, selectedGroup, selectedLayer, layer, toggleOn;

    this._handlingClick = true;

    selectedGroup = this._getGroupByName(evt.currentTarget.groupName);
    selectedLayer = selectedGroup.getSelectedLayer();

    switch (evt.currentTarget.LayerControlAction)
    {
      case LayerControlAction.ToggleDisplay:
        selectedGroup.setDisplay(!selectedGroup.getDisplay());
        toggleOn = selectedGroup.getDisplay();

        for (i in selectedGroup.layers)
        {
          layer = selectedGroup.layers[i];
          this._setLayerDisplay(layer, layer === selectedLayer && toggleOn);
        }
        break;

      case LayerControlAction.ToggleLabels:
        selectedGroup.setLabeled(!selectedGroup.getLabeled());
        if (this.options.labelCallback)
        {
          this.options.labelCallback(this._getLabeledLayers());
        }
        break;

      case LayerControlAction.SelectLayer:
        toggleOn = selectedGroup.getDisplay();
        for (i in selectedGroup.layers)
        {
          layer = selectedGroup.layers[i];
          this._setLayerDisplay(layer, (layer === selectedLayer) && toggleOn);
        }

        if (this.options.labelCallback && selectedGroup.getLabeled())
        {
          this.options.labelCallback(this._getLabeledLayers());
        }
        break;
    }

    this._handlingClick = false;
  },

  _setLayerDisplay: function (layer, visible)
  {
    var currentDisplay = this._map.hasLayer(layer);
    if (currentDisplay !== visible)
    {
      if (visible)
      {
        this._map.addLayer(layer);
      } else
      {
        this._map.removeLayer(layer);
      }
    }
  },

  _getLabeledLayers: function ()
  {
    return this._groups.filter(function (g) { return g.getLabeled(); }).map(function (g) { return g.getSelectedLayer(); });
  },

  _expand: function ()
  {
    L.DomUtil.addClass(this._container, 'leaflet-control-layers-expanded');
  },

  _collapse: function ()
  {
    this._container.className = this._container.className.replace(' leaflet-control-layers-expanded', '');
  },
});

L.control.groupedLayers = function (layers, options)
{
  return new L.Control.GroupedLayers(layers, options);
};
