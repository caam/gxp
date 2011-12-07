/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @include widgets/FilterBuilder.js
 * @include data/WFSFeatureStore.js
 */

/** api: (define)
 *  module = gxp
 *  class = QueryPanel
 *  base_link = `Ext.Panel <http://extjs.com/deploy/dev/docs/?class=Ext.Panel>`_
 */
Ext.namespace("gxp");

/** api: constructor
 *  .. class:: QueryPanel(config)
 *   
 *      Create a panel for assembling and issuing feature requests.
 */
gxp.QueryPanel = Ext.extend(Ext.Panel, {

    /** api: config[layerStore]
     *  ``Ext.data.Store``
     *  A store with records representing each WFS layer to be queried. Records
     *  must have ``title``, ``name`` (feature type), ``namespace`` (namespace
     *  URI), ``url`` (wfs url), and ``schema`` (schema url) fields.
     */
    
    /** api: config[map]
     *  ``OpenLayers.MapPanel`` The map to take the spatial extent for the
     *  spatialQuery from. Required.
     */

    /** api: config[maxFeatures]
     *  ``Number``
     *  Optional limit for number of features requested in a query.  No limit
     *  set by default.
     */
    
    /** api: config[layout]
     *  ``String``
     *  Defaults to "form."
     */
    layout: "form",
    
    /** api: config[spatialQuery]
     *  ``Boolean``
     *  Initial state of "query by location" checkbox.  Default is true.
     */
    
    /** api: property[spatialQuery]
     *  ``Boolean``
     *  Query by extent.
     */
    spatialQuery: false,
    bufferQuery: false,
    sigpacQuery: true,
    
    /** api: config[attributeQuery]
     *  ``Boolean``
     *  Initial state of "query by attribute" checkbox.  Default is false.
     */
    
    /** api: property[attributeQuery]
     *  ``Boolean``
     *  Query by attributes.
     */
    attributeQuery: false,
    
    /** private: property[selectedLayer]
     *  ``Ext.data.Record``
     *  The currently selected record in the layers combo.
     */
    selectedLayer: null,
    
    /** private: property[featureStore]
     *  ``GeoExt.data.FeatureStore``
     *  After a query has been issued, this will be a store with records based
     *  on the return from the query.
     */
    featureStore: null,
    
    /** api: property[attributeStore]
     *  ``GeoExt.data.AttributeStore``
     *  The attributes associated with the currently selected layer.
     */
    attributeStore: null,
    
    /** api: property[geometryType]
     *  ``String`` (Multi)?(Point|Line|Polygon|Curve|Surface|Geometry) The
     *  geometry type of features of the selected layer. If the layer has
     *  multiple geometry fields, the type of the first geometry field will
     *  be returned.
     */
    geometryType: null,

    /** private: property[geometryName]
     *  ``String``
     *  Name of the first geometry attribute found when the attributes store
     *  loads.
     */
    geometryName: null,

    /** i18n */
    queryByLocationText: "Query by location",
    queryByBufferText: "Query by buffer",
    currentTextText: "Current extent",
    queryByAttributesText: "Query by attributes",
    layerText: "Layer",

    /** private: method[initComponent]
     */
    initComponent: function() {
        
        this.addEvents(
            
            /** api: events[ready]
             *  Fires when the panel is ready to issue queries (after the
             *  internal attribute store has loaded).
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.QueryPanel` This query panel.
             *  * store - ``GeoExt.data.FeatureStore`` The feature store.
             */
            "ready",

            /** api: events[beforelayerchange]
             *  Fires before a new layer is selected.  Return false to stop the
             *  layer selection from changing.
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.QueryPanel` This query panel.
             *  * record - ``Ext.data.Record`` Record representing the newly
             *      selected layer.
             */
            "beforelayerchange",

            /** api: events[layerchange]
             *  Fires when a new layer is selected, as soon as this panel's
             *  ``attributesStore`` and ``geometryType`` attributes are set.
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.QueryPanel` This query panel.
             *  * record - ``Ext.data.Record`` Record representing the selected
             *      layer.
             */
            "layerchange",

            /** api: events[beforequery]
             *  Fires before a query for features is issued.  If any listener
             *  returns false, the query will not be issued.
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.QueryPanel` This query panel.
             */
            "beforequery",

            /** api: events[query]
             *  Fires when a query for features is issued.
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.QueryPanel` This query panel.
             *  * store - ``GeoExt.data.FeatureStore`` The feature store.
             */
            "query",

            /** api: events[storeload]
             *  Fires when the feature store loads.
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.QueryPanel` This query panel.
             *  * store - ``GeoExt.data.FeatureStore`` The feature store.
             *  * records - ``Array(Ext.data.Record)`` The records that were
             *      loaded.
             *  * options - ``Object`` The loading options that were specified.
             */
            "storeload"

        );        
        
        this.mapExtentField = new Ext.form.TextField({
            fieldLabel: this.currentTextText,
            readOnly: true,
            anchor: "100%",
            value: this.getFormattedMapExtent()
        });

        this.queryMunicipio = new Ext.form.TextField({ fieldLabel: "Municipio", readOnly: false, anchor: "100%", value: "" });
        this.queryPoligono = new Ext.form.TextField({ fieldLabel: "Polígono", readOnly: false, anchor: "100%", value: "" });
        this.queryParcela = new Ext.form.TextField({ fieldLabel: "Parcela", readOnly: false, anchor: "100%", value: "" });
        this.queryRecinto = new Ext.form.TextField({ fieldLabel: "Recinto", readOnly: false, anchor: "100%", value: "" });

        this.bufferFieldX = new Ext.form.TextField({
            fieldLabel: "X",
            readOnly: false,
            anchor: "100%",
            value: this.map.getCenter()&&this.map.getCenter().lon()
        });
        this.bufferFieldY = new Ext.form.TextField({
            fieldLabel: "Y",
            readOnly: false,
            anchor: "100%",
            value: this.map.getCenter()&&this.map.getCenter().lat()
        });
        this.bufferFieldR = new Ext.form.TextField({
            fieldLabel: "R",
            readOnly: false,
            anchor: "100%",
            value: this.map.getExtent()&&(this.map.getExtent().right() - this.map.getExtent().left())
        });

        this.map.events.on({
            moveend: this.updateMapExtent,
            scope: this
        });

        this.createFilterBuilder(this.layerStore.getAt(0));
        
        this.items = [{
            xtype: "combo",
            name: "layer",
            fieldLabel: this.layerText,
            store: this.layerStore,
            value: this.layerStore.getAt(0).get("name"),
            displayField: "title",
            valueField: "name",
            mode: "local",
            allowBlank: true,
            editable: false,
            triggerAction: "all",
            listeners: {
                beforeselect: function(combo, record, index) {
                    return this.fireEvent("beforelayerchange", this, record);
                },
                select: function(combo, record, index) {
                    this.createFilterBuilder(record);
                },
                scope: this
            }
        }, {
            xtype: "fieldset",
            title: "consultaSIGPAC",
            checkboxToggle: true,
            collapsed: !this.sigpacQuery,
            anchor: "95%",
            items: [ this.queryMunicipio, this.queryPoligono, this.queryParcela, this.queryRecinto ],
            listeners: {
                collapse: function() {
                    this.sigpacQuery = false;
                },
                expand: function() {
                    this.sigpacQuery = true;
                },
                scope: this
            }
        }, {

            xtype: "fieldset",
            title: this.queryByAttributesText,
            checkboxToggle: true,
            collapsed: !this.attributeQuery,
            anchor: "95%",
            items: [this.filterBuilder],
            listeners: {
                collapse: function() {
                    this.attributeQuery = false;
                },
                expand: function() {
                    this.attributeQuery = true;
                },
                scope: this
            }            
        }, {
            xtype: "fieldset",
            title: this.queryByLocationText,
            checkboxToggle: true,
            collapsed: !this.spatialQuery,
            anchor: "95%",
            items: [this.mapExtentField],
            listeners: {
                collapse: function() {
                    this.spatialQuery = false;
                },
                expand: function() {
                    this.spatialQuery = true;
                },
                scope: this
            }
        }, {
         xtype: "fieldset",
            title: this.queryByBufferText,
            checkboxToggle: true,
            collapsed: !this.bufferQuery,
            anchor: "95%",
            items: [this.bufferFieldX, this.bufferFieldY, this.bufferFieldR],
            listeners: {
                collapse: function() {
                    this.bufferQuery = false;
                },
                expand: function() {
                    this.bufferQuery = true;
                },
                scope: this
            }
        }];
        
        gxp.QueryPanel.superclass.initComponent.apply(this, arguments);

    },
    
    /** private: method[createFilterBuilder]
     *  :arg record: ``Ext.data.Record``  A record representing the feature
     *      type.
     *  
     *  Remove any existing filter builder and create a new one.  This method
     *  also sets the currently selected layer and stores the name for the
     *  first geometry attribute found when the attribute store loads.
     */
    createFilterBuilder: function(record) {
        this.selectedLayer = record;
        var owner = this.filterBuilder && this.filterBuilder.ownerCt;
        if (owner) {
            owner.remove(this.filterBuilder, true);
        }

        this.attributeStore = new GeoExt.data.AttributeStore({
            url: record.get("schema"),
            listeners: {
                load: function(store) {
                    this.geometryName = null;
                    store.filterBy(function(r) {
                        var match = /gml:((Multi)?(Point|Line|Polygon|Curve|Surface|Geometry)).*/.exec(r.get("type"));
                        if (match && !this.geometryName) {
                            this.geometryName = r.get("name");
                            this.geometryType = match[1];
                            this.fireEvent("layerchange", this, record);
                        }
                        return !match;
                    }, this);
                    this.createFeatureStore();
                },
                scope: this
            },
            autoLoad: true
        });

        this.filterBuilder = new gxp.FilterBuilder({
            //anchor: "-8px",
            attributes: this.attributeStore,
            allowGroups: true
        });
        
        if(owner) {
            owner.add(this.filterBuilder);
            owner.doLayout();
        }
        
    },
    
    getFormattedMapExtent: function() {
        return this.map &&
            this.map.getExtent() &&
            this.map.getExtent().toBBOX().replace(/\.(\d)\d*/g, ".$1").replace(/,/g, ", ");
    },
    
    updateMapExtent: function() {
        this.mapExtentField.setValue(this.getFormattedMapExtent());
    },
    
    /** api: method[getFilter]
     *  Get the filter representing the conditions in the panel.  Returns false
     *  if neither spatial nor attribute query is checked.
     */
    getFilter: function() {
        var attributeFilter = this.attributeQuery && this.filterBuilder.getFilter();
        var spatialFilter = this.spatialQuery && new OpenLayers.Filter.Spatial({
            type: OpenLayers.Filter.Spatial.BBOX,
            value: this.map.getExtent()
        });
        var bufferFilter = this.bufferQuery && new OpenLayers.Filter.Spatial({
            type: OpenLayers.Filter.Spatial.DWITHIN,
            value: new OpenLayers.Geometry.Point(
              this.bufferFieldX.getValue(),
              this.bufferFieldY.getValue()),
            distance: this.bufferFieldR.getValue(),
            distanceUnits: 'm'
        });
        var filtersSigpac = [];
        var filterMunicipio = new OpenLayers.Filter.Comparison({
          type: OpenLayers.Filter.Comparison.EQUAL_TO,
          property: 'municipio',
          value: this.queryMunicipio.getValue()
        });
        if (this.queryMunicipio.getValue().length > 0) {filtersSigpac.push(filterMunicipio);}
        var filterPoligono = new OpenLayers.Filter.Comparison({
          type: OpenLayers.Filter.Comparison.EQUAL_TO,
          property: 'poligono',
          value: this.queryPoligono.getValue()
        });
        if (this.queryPoligono.getValue().length > 0) {filtersSigpac.push(filterPoligono);}
        var filterParcela = new OpenLayers.Filter.Comparison({
          type: OpenLayers.Filter.Comparison.EQUAL_TO,
          property: 'parcela',
          value: this.queryParcela.getValue()
        });
        if (this.queryParcela.getValue().length > 0) {filtersSigpac.push(filterParcela);}
        var filterRecinto = new OpenLayers.Filter.Comparison({
          type: OpenLayers.Filter.Comparison.EQUAL_TO,
          property: 'recinto',
          value: this.queryRecinto.getValue()
        });
        if (this.queryRecinto.getValue().length > 0) {filtersSigpac.push(filterRecinto);}
        var filterSigpac = this.sigpacQuery && new OpenLayers.Filter.Logical({
           type: OpenLayers.Filter.Logical.AND,
           filters: filtersSigpac
        });


        var filter;
        if (attributeFilter && spatialFilter) {
            filter = new OpenLayers.Filter.Logical({
                type: OpenLayers.Filter.Logical.AND,
                filters: [spatialFilter, attributeFilter]
            });
        } else {
            filter = filterSigpac || attributeFilter || spatialFilter || bufferFilter;
        }
        return filter;
    },
    
    /** private: method[getFieldType]
     *  :arg attrType: ``String`` Attribute type.
     *  :returns: ``String`` Field type
     *
     *  Given a feature attribute type, return an Ext field type if possible.
     *  Note that there are many unhandled xsd types here.
     *  
     *  TODO: this should go elsewhere (AttributeReader)
     */
    getFieldType: function(attrType) {
        return ({
            "xsd:boolean": "boolean",
            "xsd:int": "int",
            "xsd:integer": "int",
            "xsd:short": "int",
            "xsd:long": "int",
            "xsd:date": "date",
            "xsd:string": "string",
            "xsd:float": "float",
            "xsd:double": "float"
        })[attrType];
    },
    
    /** private: method[createFeatureStore]
     *  Create the feature store for the selected layer.  Queries cannot be
     *  issued until this store has been created.  This method is called
     *  when the required attribute store loads.
     */
    createFeatureStore: function() {
        var fields = [];
        this.attributeStore.each(function(record) {
            fields.push({
                name: record.get("name"),
                type: this.getFieldType(record.get("type"))
            });
        }, this);
        
        var layer = this.selectedLayer;
        
        this.featureStore = new gxp.data.WFSFeatureStore({
            fields: fields,
            srsName: this.map.getProjection(),
            url: layer.get("url"),
            featureType: layer.get("name"),
            featureNS:  layer.get("namespace"),
            geometryName: this.geometryName,
            schema: layer.get("schema"),
            maxFeatures: this.maxFeatures,
            autoLoad: false,
            autoSave: false,
            listeners: {
                load: function(store, records, options) {
                    this.fireEvent("storeload", this, store, records, options);
                },
                scope: this
            }
        });
        this.fireEvent("ready", this, this.featureStore);
    },
    
    /** api: method[query]
     *  Issue a request for features.  Should not be called until the "ready"
     *  event has fired.  If called before ready, no query will be issued.
     */
    query: function() {
        if (this.featureStore) {
            if (this.fireEvent("beforequery", this) !== false) {
                this.featureStore.setOgcFilter(this.getFilter());
                this.featureStore.load();
                this.fireEvent("query", this, this.featureStore);
            }
        }
    },

    /** private: method[beforeDestroy]
     *  Private method called during the destroy sequence.
     */
    beforeDestroy: function() {
        if (this.map && this.map.events) {
            this.map.events.un({
                moveend: this.updateMapExtent,
                scope: this
            });
        }
        gxp.QueryPanel.superclass.beforeDestroy.apply(this, arguments);
    }

});

/** api: xtype = gxp_querypanel */
Ext.reg('gxp_querypanel', gxp.QueryPanel); 
