(function(e,t){typeof define=="function"&&define.amd?define("src/marshaller/FlyoutButton",["../form/Button","../layout/Popup","../layout/Surface"],t):e.marshaller_FlyoutButton=t(e.form_Button,e.layout_Popup,e.layout_Surface)})(this,function(e,t,n){function r(){e.call(this),this.value("^");var r=this;this._popupSurface=(new n).surfaceBackgroundColor("rgb(234, 249, 255)").buttonAnnotations([{id:"",label:"",width:20,padding:"0px 5px","class":"close",font:"FontAwesome"}]).on("click",function(e){e.class==="close"&&r._popup.visible(!1).popupState(!1).render()}),this._popup=(new t).size({width:400,height:400}).position("absolute").widget(this._popupSurface)}return r.prototype=Object.create(e.prototype),r.prototype.constructor=r,r.prototype._class+=" marshaller_FlyoutButton",r.prototype.publishProxy("title","_popupSurface"),r.prototype.publishProxy("widget","_popupSurface"),r.prototype.click=function(e){var t=this;this._popup.visible(!0).popupState(!0).render(function(e){var n=t._popupSurface.widget().getBBox();t._popupSurface.resize({width:n.width,height:n.height+t._popupSurface.calcHeight(t._popupSurface.element().select(".surfaceTitle"))+18}),t._popup.render()})},r.prototype.enter=function(t,n){e.prototype.enter.apply(this,arguments);var r=this;while(r&&["marshaller_HTML","marshaller_Graph"].indexOf(r.classID())===-1)r=r.locateParentWidget();r&&(this._popupParentWidget=r,this._popup.target(r.node()))},r.prototype.render=function(t){var n=this;e.prototype.render.call(n,function(e){var r=n._popupParentWidget.getBBox(),i=e.getBBox();n._popup.left(i.x-r.x+i.width-n._popup.width()).top(i.y-r.y+i.height).visible(!1).popupState(!1).render(),t&&t(e)})},r}),function(e,t){typeof define=="function"&&define.amd?define("src/marshaller/HipieDDL",["d3","../common/Database","../common/Utility","../other/Comms","../common/Widget","require"],t):e.marshaller_HipieDDL=t(e.d3,e.common_Database,e.common_Utility,e.other_Comms,e.common_Widget,e.require)}(this,function(e,t,n,r,i,s){function u(e,t){var n=e.split("."),r=t;for(var i=0;i<n.length;++i){var s=n[i];if(!r||r[s]===undefined)return!1;r=r[s]}return!0}function a(e){return e?String.fromCharCode(parseInt(e)):e}function f(e,t){this.visualization=e;var n={};for(var r in t)t[r]instanceof Array?t[r].forEach(function(e,t){n[t===0?r:r+"_"+t]=e}):n[r]=t[r];this.mappings=n,this.hasMappings=!1,this.reverseMappings={},this.columns=[],this.columnsIdx={},this.columnsRHS=[],this.columnsRHSIdx={}}function l(e){switch(e){case"bool":case"boolean":return"boolean";case"integer":case"float":case"double":return"number";case"date":case"time":return"time"}return"string"}function c(e,t){f.call(this,e,t),this.columns=["label","weight"],this.columnsIdx={label:0,weight:1},this.init()}function h(e,t){f.call(this,e,t),t.state?(this.columns=["state","weight"],this.columnsIdx={state:0,weight:1}):t.county?(this.columns=["county","weight"],this.columnsIdx={county:0,weight:1}):t.geohash&&(this.columns=["geohash","weight"],this.columnsIdx={geohash:0,weight:1}),this.init()}function p(e,t){f.call(this,e,t),t.state?(this.columns=["state"],this.columnsIdx={state:0}):t.county?(this.columns=["county"],this.columnsIdx={county:0}):t.geohash&&(this.columns=["geohash"],this.columnsIdx={geohash:0}),t.weight.forEach(function(e,t){this.columns.push(e),this.columnsIdx[t===0?"weight":"weight_"+t]=t+1},this),this.init()}function d(e,t){f.call(this,e,t),this.columns=["x","y","weight"],this.columnsIdx={x:0,y:1,weight:2},this.init()}function v(e,t){var n={label:t.x[0]};t.y.forEach(function(e,t){n[e]=e}),f.call(this,e,n),this.init()}function m(e,t){var n={};for(var r in t)t[r].forEach(function(t,r){n[e.label[r]]=t});f.call(this,e,n),this.init()}function g(e,t,n){f.call(this,e,t),this.icon=e.icon||{},this.fields=e.fields||{},this.columns=["uid","label","weight","flags"],this.columnsIdx={uid:0,label:1,weight:2,flags:3},this.init(),this.link=n,this.visualization=e}function y(e,t){this.visualization=e;if(t){this._id=t.id,this._output=t.output,this.mappings=null,t.mappings||console.log("no mappings for:"+e.id+"->"+t.id);switch(this.visualization.type){case"LINE":this.mappings=new v(this.visualization,t.mappings);break;case"TABLE":this.mappings=new m(this.visualization,t.mappings);break;case"GRAPH":this.mappings=new g(this.visualization,t.mappings,t.link);break;case"CHORO":t.mappings.weight instanceof Array&&t.mappings.weight.length?(this.mappings=new p(this.visualization,t.mappings,t.link),t.mappings.weight.length>1&&(this.visualization.type="LINE")):this.mappings=new h(this.visualization,t.mappings,t.link);break;case"HEAT_MAP":this.mappings=new d(this.visualization,t.mappings,t.link);break;default:this.mappings=new c(this.visualization,t.mappings)}this.first=t.first,this.reverse=t.reverse,this.sort=t.sort}}function b(e,t,n){this.visualization=e,this.eventID=t,n&&(this._updates=n.updates,this.mappings=n.mappings)}function w(e,t){this.visualization=e,this.events={};for(var n in t)this.events[n]=new b(e,n,t[n])}function E(e,t){this.dashboard=e,this.id=t.id,this.label=t.label,this.title=t.title||t.id,this.type=t.type,this.icon=t.icon||{},this.fields=t.fields||{},this.properties=t.properties||(t.source?t.source.properties:null)||{},this.source=new y(this,t.source),this.events=new w(this,t.events);var n=this;switch(this.type){case"CHORO":this.source.mappings.contains("state")?this.loadWidget("src/map/ChoroplethStates",function(e){e.id(t.id).paletteID_default(t.color)}):this.source.mappings.contains("county")?this.loadWidget("src/map/ChoroplethCounties",function(e){e.id(t.id).paletteID_default(t.color)}):this.source.mappings.contains("geohash")&&this.loadWidget("src/map/Layered",function(e){e.id(t.id)});break;case"2DCHART":case"PIE":case"BUBBLE":case"BAR":case"WORD_CLOUD":this.loadWidget("src/composite/MegaChart",function(e){e.id(t.id).legendPosition_default("none").chartType_default(n.properties.chartType||n.properties.charttype||n.type)});break;case"LINE":this.loadWidget("src/composite/MegaChart",function(e){e.id(t.id).legendPosition_default("none").chartType_default(n.properties.chartType||n.properties.charttype||n.type)});break;case"TABLE":this.loadWidget("src/composite/MegaChart",function(e){e.id(t.id).legendPosition_default("none").showChartSelect_default(!1).chartType_default("TABLE").chartTypeDefaults({pagination:!0})});break;case"SLIDER":this.loadWidget("src/form/Slider",function(e){e.id(t.id);if(t.range){var n="";for(var r in t.events.events.mappings){n=r;break}e.low_default(+t.range[0]).high_default(+t.range[1]).step_default(+t.range[2]).selectionLabel_default(n)}});break;case"GRAPH":this.loadWidgets(["src/graph/Graph"],function(e){e.id(t.id).layout_default("ForceDirected2").applyScaleOnLayout_default(!0)});break;case"FORM":this.loadWidgets(["src/form/Form","src/form/Input","src/form/Button","src/form/CheckBox","src/form/ColorInput","src/form/Radio","src/form/Range","src/form/Select","src/form/Slider","src/form/TextArea"],function(e,n){var r=n[1],i=n[3],s=n[5],o=n[7],u=n[9];e.id(t.id).inputs(t.fields.map(function(e){var t=[],n=[],a;switch(e.properties.charttype){case"TEXT":a=(new r).type_default("text");break;case"TEXTAREA":a=new u;break;case"CHECKBOX":a=new i;break;case"RADIO":a=new s;break;case"HIDDEN":a=(new r).type_default("hidden");break;default:if(e.properties.enumvals){a=new o,n=e.properties.enumvals;for(var f in n)t.push([f,n[f]])}else a=(new r).type_default("text")}a.name_default(e.id).label_default((e.properties?e.properties.label:null)||e.label).value_default(e.properties.default?e.properties.default:"");if(a instanceof i||a instanceof s){var l=Object.keys(e.properties.enumvals);a.selectOptions_default(l)}else t.length&&a.selectOptions_default(t);return a}))});break;case"HEAT_MAP":this.loadWidgets(["src/other/HeatMap"],function(e){e.id(t.id).image_default(n.properties.imageUrl)});break;default:this.loadWidget("src/common/TextBox",function(e){e.id(t.id).text_default(n.id+"\n"+"TODO:  "+n.type)})}}function S(e,t){this.dataSource=e,this.id=t.id,this.from=t.from,this.request={},this.notify=t.notify||[],this.filter=t.filter||[]}function x(e,t,n){this.dashboard=e,this.id=t.id,this.filter=t.filter||[],this.WUID=t.WUID,this.URL=t.URL,this.databomb=t.databomb,this.request={},this._loadedCount=0;var i=this;this.outputs={};var s=[];t.outputs.forEach(function(e){i.outputs[e.id]=new S(i,e),s.push({id:e.id,from:e.from,filter:e.filter||this.filter})},this),this.WUID?this.comms=(new r.HIPIEWorkunit).url(e.marshaller.espUrl._url).proxyMappings(n).hipieResults(s):this.databomb?this.comms=(new r.HIPIEDatabomb).hipieResults(s):this.comms=(new r.HIPIERoxie).url(t.URL).proxyMappings(n)}function T(e,t,n){this.marshaller=e,this.id=t.id,this.title=t.title;var r=this;this.datasources={},this.datasourceTotal=0,t.datasources.forEach(function(e){r.datasources[e.id]=new x(r,e,n),++r.datasourceTotal}),this._visualizations={},this._visualizationArray=[],t.visualizations.forEach(function(e){var t=new E(this,e);this._visualizations[e.id]=t,this._visualizationArray.push(t),this.marshaller._visualizations[e.id]=t,this.marshaller._visualizationArray.push(t)},this),this._visualizationTotal=this._visualizationArray.length}function N(){this._proxyMappings={},this._widgetMappings=e.map(),this._clearDataOnUpdate=!0,this._propogateClear=!1}var o="...loading...";return f.prototype.init=function(){for(var e in this.mappings)this.reverseMappings[this.mappings[e]]=e,this.columnsIdx[e]===undefined&&(this.columns.push(e),this.columnsIdx[e]=this.columns.length-1),this.columnsRHS[this.columnsIdx[e]]=this.mappings[e],this.columnsRHSIdx[this.mappings[e]]=this.columnsIdx[e],this.hasMappings=!0},f.prototype.getFields=function(){return this.visualization.fields?Object.keys(this.mappings).map(function(e){return this.visualization.fields.filter(function(t){return t.id===this.mappings[e]},this).map(function(e){return(new t.Field(e.id)).type(l(e.properties.type)).label(this.reverseMappings[e.id])},this)[0]},this):null},f.prototype.contains=function(e){return this.mappings[e]!==undefined},f.prototype.doMap=function(e){var t=[];for(var n in this.mappings){var r=this.mappings[n];try{var i=e[r];i===undefined&&(i=e[r.toLowerCase()]),t[this.columnsIdx[n]]=i}catch(s){console.log("Invalid Mapping:  "+this.visualization.id+" ["+r+"->"+e+"]")}}return t},f.prototype.doMapAll=function(e){return e.hipieMappings(this.columnsRHS)},f.prototype.getMap=function(e){return this.mappings[e]},f.prototype.getReverseMap=function(e){return this.reverseMappings[e]},c.prototype=Object.create(f.prototype),h.prototype=Object.create(f.prototype),p.prototype=Object.create(f.prototype),d.prototype=Object.create(f.prototype),v.prototype=Object.create(f.prototype),m.prototype=Object.create(f.prototype),m.prototype.init=function(){this.visualization.label.forEach(function(e,t){this.reverseMappings[this.mappings[e]]=e,this.columns.push(e),this.columnsIdx[e]=t,this.columnsRHS[t]=this.mappings[e],this.columnsRHSIdx[this.mappings[e]]=t,this.hasMappings=!0},this)},g.prototype=Object.create(f.prototype),g.prototype.calcAnnotation=function(e,t,n){function i(e,t){if(e)for(var r in e)switch(r){case"faChar":t.faChar=a(e.faChar);break;case"tooltip":t[r]=e[r];break;case"icon_image_colorFill":case"icon_shape_colorFill":case"icon_shape_colorStroke":n?t[r.split("icon_")[1]]=e[r]:t[r]=e[r];break;case"textbox_image_colorFill":case"textbox_shape_colorFill":case"textbox_shape_colorStroke":n||(t[r]=e[r]);break;case"id":case"valuemappings":case"font":case"charttype":break;default:console.log("Unknown annotation property:  "+r)}}var r={};i(e,r);if(t&&t[e.id]&&e.valuemappings){var s=e.valuemappings[t[e.id]];i(s,r)}for(var o in r)return r;return null},g.prototype.doMapAll=function(e){function o(e,t){var o="uid_"+e[0],u=r[o];u||(u=(new s.Vertex).faChar(n.icon&&n.icon.faChar?a(n.icon.faChar):"").text(e[1]?e[1]:""),u.__hpcc_uid=e[0],r[o]=u,i.push(u));if(t){e[1]&&u.text(e[1]);var f=n.calcAnnotation(n.visualization.icon,t);if(f)for(var l in f)u[l]&&u[l](f[l]);var c=[];n.fields.forEach(function(e){var r=n.calcAnnotation(e,t,!0);r&&c.push(r)}),u.annotationIcons(c)}return u}var t=e.jsonObj(),n=this,r={},i=[],s=this.visualization.widget,u=[];return t.forEach(function(e){var t=n.doMap(e),r=o(t,e);if(e[n.link.childfile]&&e[n.link.childfile].Row){var i=e[n.link.childfile].Row;i.forEach(function(e,t){var i=n.doMap(e),a=o(i);if(r.id()!==a.id()){var f=(new s.Edge).sourceVertex(r).targetVertex(a).sourceMarker("circleFoot").targetMarker("arrowHead");u.push(f)}})}}),{vertices:i,edges:u,merge:!1}},y.prototype.getQualifiedID=function(){return this.visualization.getQualifiedID()+"."+this.id},y.prototype.exists=function(){return this._id},y.prototype.getDatasource=function(){return this.visualization.dashboard.datasources[this._id]},y.prototype.getOutput=function(){var e=this.getDatasource();return e&&e.outputs?e.outputs[this._output]:null},y.prototype.hasData=function(){return this.getOutput().db?!0:!1},y.prototype.getFields=function(){return this.mappings.getFields()},y.prototype.getColumns=function(){return this.mappings.columns},y.prototype.getData=function(){var e=this.getOutput().db,t=e.data();t.length&&this.sort&&n.multiSort(t,e.hipieMapSortArray(this.sort));var r=this.mappings.doMapAll(e);return this.reverse&&r.reverse(),this.first&&r.length>this.first&&(r.length=this.first),r},y.prototype.getXTitle=function(){return this.mappings.columns[0]},y.prototype.getYTitle=function(){return this.mappings.columns.filter(function(e,t){return t>0}).join(" / ")},b.prototype.exists=function(){return this._updates!==undefined},b.prototype.getUpdates=function(){var e=[];return u("_updates",this)&&this._updates instanceof Array&&this._updates.forEach(function(t,n){var r=this.visualization.dashboard.datasources[t.datasource],i=this.visualization.dashboard.getVisualization(t.visualization);e.push({eventID:this.eventID,datasource:r,visualization:i})},this),e},b.prototype.getUpdatesDatasources=function(){var e={},t=[];return this.getUpdatesVisualizations().forEach(function(n,r){var i=n.source.getDatasource();i&&!e[i.id]&&(e[i.id]=!0,t.push(i))},this),t},b.prototype.getUpdatesVisualizations=function(){var e={},t=[];return u("_updates",this)&&this._updates instanceof Array&&this._updates.forEach(function(n,r){var i=this.visualization.dashboard.getVisualization(n.visualization);e[i.id]||(e[i.id]=!0,t.push(i))},this),t},w.prototype.setWidget=function(e){var t=this;for(var n in this.events)e["vertex_"+n]?e["vertex_"+n]=function(e){t.visualization.onEvent(n,t.events[n],e)}:e[n]&&(e[n]=function(e,r,i){t.visualization.onEvent(n,t.events[n],e,r,i)})},w.prototype.exists=function(){return this._updates!==undefined},w.prototype.getUpdates=function(){var e=[];for(var t in this.events)e=e.concat(this.events[t].getUpdates());return e},w.prototype.getUpdatesDatasources=function(){var e=[];for(var t in this.events)e=e.concat(this.events[t].getUpdatesDatasources());return e},w.prototype.getUpdatesVisualizations=function(){var e=[];for(var t in this.events)e=e.concat(this.events[t].getUpdatesVisualizations());return e},E.prototype.getQualifiedID=function(){return this.id},E.prototype.isLoading=function(e,t){return this.widget===null},E.prototype.isLoaded=function(e,t){return this.widget instanceof i},E.prototype.loadWidget=function(e,t){this.loadWidgets([e],t)},E.prototype.loadWidgets=function(e,t){this.widget=null;var n=this;s(e,function(e){n.dashboard.marshaller._widgetMappings.has(n.id)?n.setWidget(n.dashboard.marshaller._widgetMappings.get(n.id)):n.setWidget(new e),t&&t(n.widget,arguments)})},E.prototype.setWidget=function(e){this.widget=e,this.events.setWidget(e);for(var t in this.properties)switch(e.classID()){case"chart_MultiChart":case"composite_MegaChart":e.chartTypeDefaults()[t]=this.properties[t];break;default:if(this.widget[t+"_default"])try{this.widget[t+"_default"](this.properties[t])}catch(n){console.log("Invalid Property:"+this.id+".properties."+t)}}return this.widget},E.prototype.accept=function(e){e.visit(this)},E.prototype.update=function(e){var t=this.getInputVisualizations(),n=[];t.forEach(function(e){for(var t in e._eventValues)n.push(e._eventValues[t])});var r=e||n.join(", "),i=this.widget;while(i&&!i.title)i=i.locateParentWidget();if(i){var s=i.title(),o=s.split(" (");i.title(o[0]+(r?" ("+r+")":"")).render()}else this.widget.render()},E.prototype.notify=function(){if(this.source.hasData()&&this.widget){if(!this.widget.fields().length){var e=this.source.getColumns();this.widget.columns(e)}var t=this.source.getData();this.widget.data(t),this.update()}},E.prototype.clear=function(){this.widget&&this.dashboard.marshaller.clearDataOnUpdate()&&(this.widget.data([]),this.source.getOutput().request={}),this.dashboard.marshaller.propogateClear()&&this._eventValues&&(delete this._eventValues,this.events.getUpdatesVisualizations().forEach(function(e){e.clear()})),this.update(o)},E.prototype.onEvent=function(e,t,n,r,i){var s=this;setTimeout(function(){i=i===undefined?!0:i;if(t.exists()){var e={};if(i)for(var r in t.mappings){var o=s.source.mappings&&s.source.mappings.hasMappings?s.source.mappings.getReverseMap(r):r;e[t.mappings[r]]=n[o]}s._eventValues=e;var u={},a=t.getUpdatesVisualizations();a.forEach(function(e){var t=e.source.getDatasource();u[t.id]||(u[t.id]={datasource:t,request:{},updates:[]}),u[t.id].updates.push(e.id),e.getInputVisualizations().forEach(function(e,n){if(e._eventValues)for(var r in e._eventValues)u[t.id].request[r]&&u[t.id].request[r]!==e._eventValues[r]&&console.log("Duplicate Filter, with mismatched value:  "+r+"="+e._eventValues[r]),u[t.id].request[r]=e._eventValues[r],u[t.id].request[r+"_changed"]=e===s}),e.type!=="GRAPH"&&e.clear(),(t.WUID||t.databomb)&&t.fetchData(u[t.id].request,!1,[e.id])});for(var f in u)!u[f].datasource.WUID&&!u[f].datasource.databomb&&u[f].datasource.fetchData(u[f].request,!1,u[f].updates)}},0)},E.prototype.getInputVisualizations=function(){return this.dashboard.marshaller.getVisualizationArray().filter(function(e){var t=e.events.getUpdatesVisualizations();return t.indexOf(this)>=0?!0:!1},this)},S.prototype.getQualifiedID=function(){return this.dataSource.getQualifiedID()+"."+this.id},S.prototype.accept=function(e){e.visit(this)},S.prototype.vizNotify=function(e){this.notify.filter(function(t){return!e||e.indexOf(t)>=0}).forEach(function(e){var t=this.dataSource.dashboard.getVisualization(e);t.notify()},this)},S.prototype.setData=function(e,n,r){this.request=n,this.db=(new t.Grid).jsonObj(e),this.vizNotify(r)},x.prototype.getQualifiedID=function(){return this.dashboard.getQualifiedID()+"."+this.id},x.prototype.accept=function(e){e.visit(this);for(var t in this.outputs)this.outputs[t].accept(e)},x.prototype.fetchData=function(e,t,n){if(!n){n=[];for(var r in this.outputs){var i=this.outputs[r];i.notify.forEach(function(e){(!i.filter||!i.filter.length)&&n.push(e);var t=this.dashboard.getVisualization(e);t.update(o)},this)}}var s=this;this.request.refresh=t?!0:!1,this.filter.forEach(function(t){this.request[t+"_changed"]=e[t+"_changed"]||!1;var n=e[t]===undefined?null:e[t];this.request[t]!==n&&(this.request[t]=n)},this),window.__hpcc_debug&&console.log("fetchData:  "+JSON.stringify(n)+"("+JSON.stringify(e)+")");for(var u in this.request)this.request[u]===null&&delete this.request[u];var a=Date.now();this.comms.call(this.request).then(function(t){var r=500-(Date.now()-a);setTimeout(function(){s.processResponse(t,e,n),++s._loadedCount},r>0?r:0)}).catch(function(e){s.dashboard.marshaller.commsError("DataSource.prototype.fetchData",e)})},x.prototype.processResponse=function(e,t,n){var r={};for(var i in e)r[i.toLowerCase()]=e[i];for(var s in this.outputs){var o=this.outputs[s].from;o||(o=this.outputs[s].id.toLowerCase());if(u(o,e))!u(o+"_changed",e)||u(o+"_changed",e)&&e[o+"_changed"].length&&e[o+"_changed"][0][o+"_changed"]?this.outputs[s].setData(e[o],t,n):this.outputs[s].vizNotify(n);else if(u(o,r))console.log("DDL 'DataSource.From' case is Incorrect"),!u(o+"_changed",r)||u(o+"_changed",r)&&e[o+"_changed"].length&&r[o+"_changed"][0][o+"_changed"]?this.outputs[s].setData(r[o],t,n):this.outputs[s].vizNotify(n);else{var a=[];for(var f in e)a.push(f);console.log("Unable to locate '"+o+"' in response {"+a.join(", ")+"}")}}},T.prototype.getQualifiedID=function(){return this.id},T.prototype.getVisualization=function(e){return this._visualizations[e]||this.marshaller.getVisualization(e)},T.prototype.getVisualizations=function(){return this._visualizations},T.prototype.getVisualizationArray=function(){return this._visualizationArray},T.prototype.getVisualizationTotal=function(){return this._visualizationTotal},T.prototype.accept=function(e){e.visit(this);for(var t in this.datasources)this.datasources[t].accept(e);this._visualizationArray.forEach(function(t){t.accept(e)},this)},T.prototype.allVisualizationsLoaded=function(){var e=this._visualizationArray.filter(function(e){return!e.isLoaded()});return e.length===0},N.prototype.commsDataLoaded=function(){for(var e=0;e<this.dashboardArray.length;e++)for(var t in this.dashboardArray[e].datasources)if(this.dashboardArray[e].datasources[t]._loadedCount===0)return!1;return!0},N.prototype.getVisualization=function(e){return this._visualizations[e]},N.prototype.accept=function(e){e.visit(this),this.dashboardTotal=0;for(var t in this.dashboards)this.dashboards[t].accept(e),++this.dashboardTotal},N.prototype.url=function(e,t){this.espUrl=(new r.ESPUrl).url(e);var n=null,i="HIPIE_DDL";this.espUrl.isWorkunitResult()?(i=this.espUrl._params.ResultName,n=(new r.HIPIEWorkunit).url(e).proxyMappings(this._proxyMappings)):n=(new r.HIPIERoxie).url(e).proxyMappings(this._proxyMappings);var s={refresh:!1},o=this;n.call(s).then(function(e){if(u(i,e))return n.fetchResult(i).then(function(n){var r=n[0][i];o.parse(r,function(){t(e)})}).catch(function(e){o.commsError("Marshaller.prototype.url",e)})}).catch(function(e){o.commsError("Marshaller.prototype.url",e)})},N.prototype.proxyMappings=function(e){return arguments.length?(this._proxyMappings=e,this):this._proxyMappings},N.prototype.widgetMappings=function(e){return arguments.length?(this._widgetMappings=e,this):this._widgetMappings},N.prototype.clearDataOnUpdate=function(e){return arguments.length?(this._clearDataOnUpdate=e,this):this._clearDataOnUpdate},N.prototype.propogateClear=function(e){return arguments.length?(this._propogateClear=e,this):this._propogateClear},N.prototype.parse=function(e,t){var n=this;return this._json=e,this._jsonParsed=JSON.parse(this._json),this.dashboards={},this.dashboardArray=[],this._visualizations={},this._visualizationArray=[],this._jsonParsed.forEach(function(e){var t=new T(n,e,n._proxyMappings);n.dashboards[e.id]=t,n.dashboardArray.push(t)}),this.dashboardTotal=this.dashboardArray.length,this.ready(t),this},N.prototype.getVisualizations=function(){return this._visualizations},N.prototype.getVisualizationArray=function(){return this._visualizationArray},N.prototype.on=function(e,t){if(this[e]===undefined)throw"Method:  "+e+" does not exist.";var n=this[e];return this[e]=function(){n.apply(this,arguments),t.apply(this,arguments)},this},N.prototype.allDashboardsLoaded=function(){return this.dashboardArray.filter(function(e){return!e.allVisualizationsLoaded()}).length===0},N.prototype.ready=function(e){function n(e){t.allDashboardsLoaded()?e():setTimeout(n,100,e)}if(!e)return;var t=this;n(e)},N.prototype.commsError=function(e,t){console.log("Comms Error:\n"+e+"\n"+t)},{exists:u,Marshaller:N,Dashboard:T,DataSource:x,Output:S,Visualization:E}}),function(e,t){typeof define=="function"&&define.amd?define("src/marshaller/Graph",["d3","../common/SVGWidget","../common/TextBox","../common/Surface","../common/ResizeSurface","../chart/MultiChartSurface","../common/Palette","../graph/Graph","../graph/Vertex","../graph/Edge","./HipieDDL"],t):e.marshaller_Graph=t(e.d3,e.common_SVGWidget,e.common_TextBox,e.common_Surface,e.common_ResizeSurface,e.chart_MultiChartSurface,e.common_Palette,e.graph_Graph,e.graph_Vertex,e.graph_Edge,e.marshaller_HipieDDL)}(this,function(e,t,n,r,i,s,o,u,a,f,l){function c(e,t,s){function d(e,t,n,r,i,s){r=r||"",i=i||"",s=s||"",t&&n&&e.vertexMap[t]&&e.vertexMap[n]?e.edges.push((new f).sourceVertex(e.vertexMap[t]).targetVertex(e.vertexMap[n]).sourceMarker(r).targetMarker(i).text(s)):(e.vertexMap[t]||console.log("Unknown Vertex:  "+t),e.vertexMap[n]||console.log("Unknown Vertex:  "+n))}t instanceof Object||t&&(t=JSON.parse(t));var u=null,c={},h={},p=[];return e.accept({_visualizeRoxie:s,visit:function(e){if(e instanceof l.Dashboard)u={dashboard:e,vertexMap:h,edges:p},c[e.getQualifiedID()]=u;else if(e instanceof l.DataSource){e.databomb&&t[e.id]&&e.comms.databomb(t[e.id]);if(this._visualizeRoxie){var s="";e.filter.forEach(function(e){s.length>0&&(s+=", "),s+=e}),s=" ("+s+")",u.vertexMap[e.getQualifiedID()]=(new a).class("vertexLabel").faChar("").text(e.id+s)}}else if(e instanceof l.Output)e.dataSource.databomb&&e.dataSource.comms.databombOutput(e.from),this._visualizeRoxie&&(u.vertexMap[e.getQualifiedID()]=(new a).class("vertexLabel").faChar("").text(e.id+"\n["+e.from+"]"));else if(e instanceof l.Visualization&&e.widget){var f=null;if(e.widget instanceof r)f=e.widget.size({width:210,height:210});else if(e.widget instanceof n)f=e.widget;else{var d=280,v=210;e.type==="GRAPH"&&(d=800,v=600),f=(new i).size({width:d,height:v}).title(e.title).content(e.widget)}if(f){e.widgetSurface=f,u.vertexMap[e.getQualifiedID()]=f;switch(e.type){case"2DCHART":case"PIE":case"BUBBLE":case"BAR":case"WORD_CLOUD":f.menu(e.widget._2DChartTypes.concat(e.widget._NDChartTypes.concat(e.widget._anyChartTypes)).map(function(e){return e.display}).sort()),f._menu.click=function(t){e.widget.chartType(t).render()};break;case"LINE":f.menu(e.widget._NDChartTypes.concat(e.widget._anyChartTypes).map(function(e){return e.display}).sort()),f._menu.click=function(t){e.widget.chartType(t).render()};break;case"CHORO":f._menu.data(o.rainbow()),f._menu.click=function(e){f._content.paletteID(e).render(e)};break;case"GRAPH":f._menu.data(["Circle","ForceDirected","ForceDirected2","Hierarchy"]),f._menu.click=function(e){f._content.layout(e)}}}}}}),u=null,e.accept({_visualizeRoxie:s,visit:function(e){e instanceof l.Dashboard?u=c[e.getQualifiedID()]:e instanceof l.DataSource||(e instanceof l.Output?this._visualizeRoxie&&d(u,e.dataSource.getQualifiedID(),e.getQualifiedID(),"circleFoot","circleHead"):e instanceof l.Visualization&&(this._visualizeRoxie&&(e.source.getDatasource()&&d(u,e.getQualifiedID(),e.source.getDatasource().getQualifiedID(),"","arrowHead","update"),e.source.getOutput()&&d(u,e.source.getOutput().getQualifiedID(),e.getQualifiedID(),"","arrowHead","notify")),e.events.getUpdates().forEach(function(t){d(u,e.getQualifiedID(),t.visualization.getQualifiedID(),undefined,"arrowHead","on "+t.eventID)})))}}),c}function p(){u.call(this),this._design_mode=!1,this._dashboards=[],this.graphAttributes=["snapToGrid","showEdges"],this.widgetAttributes=["layout","chartType","palette","title","columns","data"]}var h=2;return p.prototype=Object.create(u.prototype),p.prototype.constructor=p,p.prototype._class+=" marshaller_Graph",p.prototype.publish("ddlUrl","","string","DDL URL",null,{tags:["Private"]}),p.prototype.publish("databomb","","string","Data Bomb",null,{tags:["Private"]}),p.prototype.publish("visualizeRoxie",!1,"boolean","Show Roxie Data Sources",null,{tags:["Private"]}),p.prototype.publish("proxyMappings",{},"object","Proxy Mappings",null,{tags:["Private"]}),p.prototype.design_mode=function(e){return arguments.length?(this._design_mode=e,this.showEdges(this._designMode).snapToGrid(this._designMode?12:0).allowDragging(this._designMode),this.data().vertices&&this.data().vertices.forEach(function(e){e.show_title(this._design_mode).render()},this),this):this._design_mode},p.prototype.dashboards=function(e){return arguments.length?(this._dashboards=e,this):this._dashboards},p.prototype.title=function(){var e="";return this._dashboards.forEach(function(t){e&&(e+=", "),e+=t.dashboard.title}),e},p.prototype.renderDashboards=function(e){this.data({vertices:[],edges:[]});var t=[],n=[];for(var r in this._dashboards){for(var i in this._dashboards[r].vertexMap)t.push(this._dashboards[r].vertexMap[i]);n=n.concat(this._dashboards[r].edges)}this.data({vertices:t,edges:n});var s=e?this.load():{changed:!1,dataChanged:!1};return s.changed&&this.layout(""),this},p.prototype.fetchData=function(){for(var e in this._dashboards){var t=this._dashboards[e].dashboard;for(var n in t.datasources)t.datasources[n].fetchData({},!0)}return this},p.prototype.checksum=function(e){var t=0,n=e.length,r,i;if(n===0)return t;for(r=0;r<n;r++)i=e.charCodeAt(r),t=(t<<5)-t+i,t&=t;return t},p.prototype.calcHash=function(){var e=this,t=h;for(var n in this._dashboards){var r=this._dashboards[n].dashboard;r.accept({visit:function(n){n instanceof l.Visualization&&(t+=e.checksum(n.getQualifiedID()))}})}return t},p.prototype.clear=function(){localStorage.setItem("Graph_"+this.calcHash(),"")},p.prototype.serialize=function(e,t){e=e||[],t=t||[];var n={};n.zoom={translation:this.zoom.translate(),scale:this.zoom.scale()},e.forEach(function(e){this[e]&&(n[e]=this[e]())},this);for(var r in this._dashboards){var i=this._dashboards[r].dashboard,s=i.getQualifiedID();n[s]={},i.accept({visit:function(e){if(e instanceof l.Visualization&&e.widgetSurface){var r={pos:e.widgetSurface.pos(),size:e.widgetSurface.size()};t.forEach(function(t){e.widget[t]?r[t]=e.widget[t]():e.widgetSurface[t]&&(r[t]=e.widgetSurface[t]())}),n[s][e.getQualifiedID()]=r}}})}return JSON.stringify(n)},p.prototype.save=function(){localStorage.setItem("Graph_"+this.calcHash(),this.serialize(this.graphAttributes,this.widgetAttributes))},p.prototype.deserialize=function(e,t,n){t=t||[],n=n||[];var r=!1,i=!1;t.forEach(function(t){this[t]&&e[t]!==undefined&&this[t](e[t])},this),e.zoom&&(this.setZoom(e.zoom.translation,e.zoom.scale),r=!0);for(var s in this._dashboards){var o=this._dashboards[s].dashboard,u=o.getQualifiedID();o.accept({visit:function(t){if(t instanceof l.Visualization&&e[u]&&e[u][t.getQualifiedID()]){var s=e[u][t.getQualifiedID()];t.widgetSurface.pos(s.pos).size(s.size),r=!0,n.forEach(function(e){t.widget[e]&&s[e]!==undefined?(t.widget[e](s[e]),e==="data"&&(i=!0)):t.widgetSurface[e]&&s[e]&&t.widgetSurface[e](s[e])})}}})}return{changed:r,dataChanged:i}},p.prototype.load=function(){var e={changed:!1,dataChanged:!1},t=localStorage.getItem("Graph_"+this.calcHash());return t&&(e=this.deserialize(JSON.parse(t),this.graphAttributes,this.widgetAttributes)),e},p.prototype.enter=function(e,t){u.prototype.enter.apply(this,arguments),t.classed("graph_Graph",!0)},p.prototype.update=function(e,t){u.prototype.update.apply(this,arguments)},p.prototype.render=function(e){function r(){var r=c(n,t.databomb(),t.visualizeRoxie());t.dashboards(r),t.applyScaleOnLayout(!0).layout("Hierarchy").renderDashboards(!0),u.prototype.render.call(t,function(r){t.fetchData();var i=0,s=setInterval(function(){if(n.commsDataLoaded()||++i>120)clearInterval(s),e&&e(r)},500)})}if(this.ddlUrl()===""||this.ddlUrl()===this._prev_ddlUrl&&this.databomb()===this._prev_databomb&&this._prev_visualizeRoxie===this.visualizeRoxie())return u.prototype.render.apply(this,arguments);this._prev_ddlUrl=this.ddlUrl(),this._prev_databomb=this.databomb(),this._prev_visualizeRoxie=this.visualizeRoxie();var t=this,n=(new l.Marshaller).proxyMappings(this.proxyMappings()).on("commsError",function(e,n){t.commsError(e,n)});return this.ddlUrl()[0]==="["||this.ddlUrl()[0]==="{"?n.parse(this.ddlUrl(),function(){r()}):n.url(this.ddlUrl(),function(){r()}),this},p.prototype.commsError=function(e,t){alert("Comms Error:\n"+e+"\n"+t)},p}),function(e,t){typeof define=="function"&&define.amd?define("src/marshaller/HTML",["d3","../layout/Grid","./HipieDDL","../layout/Surface","../layout/Cell","../layout/Popup","../other/Persist","./FlyoutButton"],t):e.marshaller_HTML=t(e.d3,e.layout_Grid,e.marshaller_HipieDDL,e.layout_Surface,e.layout_Cell,e.layout_Popup,e.other_Persist,e.marshaller_FlyoutButton)}(this,function(e,t,n,r,i,s,o,u){function a(){t.call(this),this.surfacePadding(0)}function f(e,t){t instanceof Object||t&&(t=JSON.parse(t));var r=null,i={};return e.accept({visit:function(e){e instanceof n.Dashboard?(r={dashboard:e,visualizations:[]},i[e.getQualifiedID()]=r):e instanceof n.DataSource?e.databomb&&t[e.id]&&e.comms.databomb(t[e.id]):e instanceof n.Output?e.dataSource.databomb&&e.dataSource.comms.databombOutput(e.from):e instanceof n.Visualization&&e.widget&&r.visualizations.push(e)}}),i}return a.prototype=Object.create(t.prototype),a.prototype.constructor=a,a.prototype._class+=" marshaller_HTML",a.prototype.publish("ddlUrl","","string","DDL URL",null,{tags:["Private"]}),a.prototype.publish("databomb","","string","Data Bomb",null,{tags:["Private"]}),a.prototype.publish("proxyMappings",{},"object","Proxy Mappings",null,{tags:["Private"]}),a.prototype.publish("clearDataOnUpdate",!0,"boolean","Clear data prior to refresh",null),a.prototype.publish("propogateClear",!1,"boolean","Propogate clear to dependent visualizations",null),a.prototype.enter=function(e,n){t.prototype.enter.apply(this,arguments),this.popupContainer=n.append("div").classed("popup-container",!0).style({height:"100px",position:"absolute","z-index":1e3})},a.prototype.render=function(i){function h(){var e=f(c.marshaller,c.databomb());for(var n in e){var s=[],o=[];e[n].visualizations.forEach(function(e,t){l.remove(e.id),e.properties.flyout?s.push(e):o.push(e)}),l.forEach(function(e,t){c.clearContent(t)});var a=0,h=0,p=c.cellDensity(),d=Math.floor(Math.sqrt(o.length));o.forEach(function(e,t){if(!c.marshaller.widgetMappings().get(e.id)){var n=null;e.widget instanceof r||e.widget.classID()==="composite_MegaChart"?n=e.widget:n=(new r).widget(e.widget),e.widget.size({width:0,height:0}),n.title(e.title);while(c.getCell(a*p,h*p)!==null)h++,h%d===0&&(a++,h=0);c.setContent(a,h,n)}}),s.forEach(function(e,t){var n=e.events.getUpdatesVisualizations();n.forEach(function(t){switch(t.widget.classID()){case"composite_MegaChart":var n=(new u).title(e.title).widget(e.widget);t.widget.toolbarWidgets().push(n)}})})}var v={};c.content().forEach(function(e){var t=e.widget();t&&t.classID()==="layout_Surface"&&(t=t.widget()),t&&(v[t.id()]=e)});for(n in e)e[n].visualizations.forEach(function(e,t){if(e.properties.flyout)return;var n=e.events.getUpdatesVisualizations(),r=n.map(function(e){return v[e.id].id()});v[e.id].indicateTheseIds(r)});t.prototype.render.call(c,function(t){for(var n in e)for(var r in e[n].dashboard.datasources)e[n].dashboard.datasources[r].fetchData({},!0);var s=0,o=setInterval(function(){if(c.marshaller.commsDataLoaded()||++s>120)clearInterval(o),i&&i(t)},500)})}if(this.ddlUrl()===""||this.ddlUrl()===this._prev_ddlUrl&&this.databomb()===this._prev_databomb)return this.marshaller&&this.marshaller.proxyMappings(this.proxyMappings()).clearDataOnUpdate(this.clearDataOnUpdate()).propogateClear(this.propogateClear()),t.prototype.render.apply(this,arguments);this._prev_ddlUrl&&this._prev_ddlUrl!==this.ddlUrl()&&this.clearContent(),this._prev_ddlUrl=this.ddlUrl(),this._prev_databomb=this.databomb();var s=[];o.widgetArrayWalker(this.content(),function(e){s.push(e)});var a=e.map(s,function(e){return e.id()}),l=e.map(s.filter(function(e){return e.id().indexOf(e._idSeed)!==0&&e.id().indexOf("_pe")!==0}),function(e){return e.id()}),c=this;return this.marshaller=(new n.Marshaller).proxyMappings(this.proxyMappings()).clearDataOnUpdate(this.clearDataOnUpdate()).propogateClear(this.propogateClear()).widgetMappings(a).on("commsError",function(e,t){c.commsError(e,t)}),this.ddlUrl()[0]==="["||this.ddlUrl()[0]==="{"?this.marshaller.parse(this.ddlUrl(),function(){h()}):this.marshaller.url(this.ddlUrl(),function(){h()}),this},a.prototype.commsError=function(e,t){alert("Comms Error:\n"+e+"\n"+t)},a}),function(e,t){typeof define=="function"&&define.amd?define("src/marshaller/Tabbed",["d3","../layout/Tabbed","../layout/Grid","./HipieDDL","../layout/Surface","../layout/Cell"],t):e.marshaller_Tabbed=t(e.d3,e.layout_Tabbed,e.layout_Grid,e.marshaller_HipieDDL,e.layout_Surface,e.layout_Cell)}(this,function(e,t,n,r,i,s){function o(){t.call(this)}function u(e,t){t instanceof Object||t&&(t=JSON.parse(t));var n=null,i={};return e.accept({visit:function(e){e instanceof r.Dashboard?(n={dashboard:e,visualizations:[]},i[e.getQualifiedID()]=n):e instanceof r.DataSource?e.databomb&&t[e.id]&&e.comms.databomb(t[e.id]):e instanceof r.Output?e.dataSource.databomb&&e.dataSource.comms.databombOutput(e.from):e instanceof r.Visualization&&e.widget&&n.visualizations.push(e)}}),i}return o.prototype=Object.create(t.prototype),o.prototype.constructor=o,o.prototype._class+=" marshaller_Tabbed",o.prototype.publish("ddlUrl","","string","DDL URL",null,{tags:["Private"]}),o.prototype.publish("databomb","","string","Data Bomb",null,{tags:["Private"]}),o.prototype.publish("proxyMappings",{},"object","Proxy Mappings",null,{tags:["Private"]}),o.prototype.publish("designMode",!1,"boolean","Design Mode",null,{tags:["Basic"]}),o.prototype.testData2=function(){return this.ddlUrl("http://10.241.100.159:8002/WsEcl/submit/query/roxie/hipie_testrelavator3.ins002_service/json"),this},o.prototype._origDesignMode=o.prototype.designMode,o.prototype.designMode=function(e){var t=o.prototype._origDesignMode.apply(this,arguments);return arguments.length&&this.widgets().forEach(function(t){t.widget().designMode(e)}),t},o.prototype.render=function(i){function a(){var e=u(o.marshaller,o.databomb());if(!s.length){o.marshaller.dashboardTotal<=1&&o.showTabs(!1);for(var r in e){var a=new n;o.addTab(a,e[r].dashboard.title);var f=0,l=0,c=Math.floor(Math.sqrt(e[r].visualizations.length));e[r].visualizations.forEach(function(e,t){t&&t%c===0&&(f++,l=0),e.widget.size({width:0,height:0}),a.setContent(f,l,e.widget,e.title),l++})}}for(var h in e)for(var p in e[h].dashboard.datasources)e[h].dashboard.datasources[p].fetchData({},!0);t.prototype.render.call(o,function(e){i&&i(e)})}if(this.ddlUrl()===""||this.ddlUrl()===this._prev_ddlUrl&&this.databomb()===this._prev_databomb)return t.prototype.render.apply(this,arguments);this._prev_ddlUrl&&this._prev_ddlUrl!==this.ddlUrl()&&this.clearTabs(),this._prev_ddlUrl=this.ddlUrl(),this._prev_databomb=this.databomb();var s=[];this.widgets().forEach(function(e){s=s.concat(e.widget().content())});var o=this;return this.marshaller=(new r.Marshaller).proxyMappings(this.proxyMappings()).widgetMappings(e.map(s.map(function(e){return e.widget()}),function(e){return e.id()})).on("commsError",function(e,t){o.commsError(e,t)}),this.ddlUrl()[0]==="["||this.ddlUrl()[0]==="{"?this.marshaller.parse(this.ddlUrl(),function(){a()}):this.marshaller.url(this.ddlUrl(),function(){a()}),this},o.prototype.commsError=function(e,t){alert("Comms Error:\n"+e+"\n"+t)},o}),define("hpcc-viz-marshaller",function(){});