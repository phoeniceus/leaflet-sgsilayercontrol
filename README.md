Leaflet.sgsilayercontrol
===========================

Leaflet layer control with support for grouping overlays together in dropdown select elements.
A single "layer" on the control can be a set of layers of which only one is selected at a time.
There is the usual display toggle to make the selected layer visible or hidden.
There is also an optional secondary toggle that invokes a callback. We use this
secondary option to manage labels, but it can be used for many other purposes.

![preview](preview.png)

## Installation

Include the compressed JavaScript and CSS files located in the `/dist` folder.

This project is also available via bower:

```
bower install leaflet-sgsilayercontrol
```

## Usage

### Initialization

Create an array of LayerControlGroup objects, each of which becomes a single visible row in your layer control.
Pass this to the groupedLayers constructor and add the control to your map.

```javascript
  var groups = [
    new LayerControlGroup([streets, landscape, grayscale], "Base", { display: "hide", label: "hide" }),
    new LayerControlGroup([cities, restaurants], "Landmarks", { display: "show", label: "unchecked" }),
    new LayerControlGroup([dogs, cats], "Random", { display: "show", label: "unchecked" })
  ];
```

The [example](example/basic.html) shows its usage with various layers.

### Creating a LayerControlGroup

The LayerControlGroup constructor takes three arguments:

```javascript
//  layers: an array of Leaflet layers, or this can also be a single layer object.
//  name: the name you want to appear for this layer in the control
//  options: these are used to initialize the toggles -
//           display: show, hide
//           labels: hide, checked, unchecked 
```

The display toggle will be set to checked or unchecked automatically based on the 
state of the map, but the the labels toggle is custom and you will need to set
its initial state explicitly. If you hide a toggle, you cannot change it from its
initial state. To create a base group, simply set the display option to "hide." 
This hides the toggle, not the layers in the group. The user cannot toggle off the display,
so the currently selected layer is always visible.

The groupedLayers contructor returns the layer control object. This constructor takes
two arguments, an array of LayerControlGroup objects and a set of options:
  
```javascript
//  autoZIndex: boolean - if true, the layers will be assigned z-index values.
//  labelCallback: this function called whenever one of the label toggle is clicked
//    (or if the user changes the selected layer AND the layers toggle is on).
```

Leaflet.sgsilayercontrol is free software, and may be redistributed under
the MIT-LICENSE.
