!function(t,r){"function"==typeof define&&define.amd?define(["d3","./Class","./PropertyExt","./Utility"],r):t.common_Database=r(t.d3,t.common_Class,t.common_PropertyExt,t.common_Utility)}(this,function(t,r,e,n){function i(t){r.call(this),e.call(this),this._id=t||this._id}function s(t){t=t||!1,r.call(this),e.call(this),this._dataChecksum=t,this._dataVersion=0,this.clear()}function o(r){this._grid=r,t.rebind(this,this._grid,"checksum","fields")}function a(t,r,e){o.call(this,t),r instanceof Array||(r=[r]),this._columnIndicies=r.filter(function(t){return t}).map(function(t){switch(typeof t){case"string":return this._grid.fieldByLabel(t).idx}return t},this),e=e||function(t){return t},this._rollup=e}function u(t,r){return t instanceof Array||(t=[t]),t.filter(function(t){return""!==t}).every(r)}function c(t){return"boolean"==typeof t}function h(t){return"number"==typeof t||!isNaN(t)}function f(t){return"string"==typeof t}function p(r,e){for(var n=0;n<r.length;++n){var i=t.time.format(r[n]).parse(e);if(i)return _=r[n],r[n]}return null}function l(t){return p(k,t)}function m(t){return p(C,t)}function d(t){return p(b,t)}function y(t){return["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","AS","DC","FM","GU","MH","MP","PW","PR","VI"].indexOf(String(t).toUpperCase())>=0}i.prototype=Object.create(r.prototype),i.prototype.constructor=i,i.prototype.mixin(e),i.prototype._class+=" common_Database.Field",i.prototype.id=function(){return this._id},i.prototype.checksum=function(){return n.checksum(this.label()+this.type()+this.mask()+this.format())},i.prototype.publish("label","","string","Label",null,{optional:!0}),i.prototype.publish("type","","set","Type",["","string","number","boolean","time","hidden"],{optional:!0}),i.prototype.publish("mask","","string","Time Mask",null,{disable:function(t){return"time"!==t.type()},optional:!0}),i.prototype.publish("format","","string","Format",null,{optional:!0}),i.prototype.typeTransformer=function(t){switch(this.type()){case"number":return Number(t);case"string":return String(t);case"boolean":return"string"==typeof t&&["false","off","0"].indexOf(t.toLowerCase())>=0?!1:Boolean(t);case"time":case"date":return this.maskTransformer(t)}return t},i.prototype.maskTransformer=function(t){return this.formatter(this.mask()).parse(String(t))},i.prototype.formatTransformer=function(t){return this.formatter(this.format())(t)},i.prototype.parse=function(t){if(!t)return t;try{return this.typeTransformer(t)}catch(r){return console.log("Unable to parse:  "+t),null}},i.prototype.transform=function(t){if(!t)return t;try{return this.formatTransformer(this.typeTransformer(t))}catch(r){return console.log("Unable to transform:  "+t),null}},i.prototype.clone=function(){function t(t,e){t[e+"_default"](r[e+"_default"]()),r[e+"_exists"]()&&t[e](r[e]())}var r=this,e=new i(this._id);return t(e,"label"),t(e,"type"),t(e,"mask"),t(e,"format"),e},i.prototype.formatter=function(r){var e;if(!r)return e=function(t){return t},e.parse=function(t){return t},e;switch(this.type()){case"time":case"date":return t.time.format(r)}return e=t.format(r),e.parse=function(t){return t},e},s.prototype=Object.create(r.prototype),s.prototype.constructor=s,s.prototype.mixin(e),s.prototype._class+=" common_Database.Grid",s.prototype.publish("fields",[],"propertyArray","Fields"),s.prototype.clear=function(){return this.fields([]),this._data=[],this._dataChecksums=[],++this._dataVersion,this},s.prototype.resetColumns=function(t){var r=this.fields();this.legacyColumns([]),this.legacyColumns(r.map(function(t){return t.label()}))},s.prototype.legacyColumns=function(t,r){return arguments.length?(this.row(0,t,r),this):this.row(0)},s.prototype.legacyData=function(t,r){return s.prototype.data.apply(this,arguments)},s.prototype.field=function(t){return this.fields()[t]};var g=s.prototype.fields;s.prototype.fields=function(t,r){return arguments.length?g.call(this,r?t.map(function(t){return t.clone()}):t):g.apply(this,arguments)},s.prototype.fieldByLabel=function(t,r){return this.fields().filter(function(e,n){return e.idx=n,r?e.label().toLowerCase()===t.toLowerCase():e.label()===t})[0]},s.prototype.data=function(t,r){return arguments.length?(this._data=r?t.map(function(t){return t.map(function(t){return t})}):t,this._dataCalcChecksum(),this):this._data},s.prototype.parsedData=function(){var t=this;return this._data.map(function(r){return r.map(function(r,e){return t.fields()[e].parse(r)})})},s.prototype.formattedData=function(){var t=this;return this._data.map(function(r){return r.map(function(r,e){return t.fields()[e].transform(r)})})},s.prototype.fieldsChecksum=function(){return n.checksum(this.fields().map(function(t){return t.checksum()}))},s.prototype.dataChecksum=function(){return n.checksum(this._dataChecksum?this._dataChecksums:this._dataVersion)},s.prototype.checksum=function(){return n.checksum([this.dataChecksum(),this.fieldsChecksum()])},s.prototype._dataCalcChecksum=function(t){return++this._dataVersion,this._dataChecksum&&(arguments.length?this._dataChecksums[t]=n.checksum(this._data[t]):this._dataChecksums=this._data.map(function(t){return n.checksum(t)})),this},s.prototype.row=function(t,r,e){if(arguments.length<2)return 0===t?this.fields().map(function(t){return t.label()}):this._data[t-1];if(0===t){var n=this.fields();this.fields(r.map(function(t,r){return e?(n[r]||new i).label_default(t):(n[r]||new i).label(t)},this))}else this._data[t-1]=r,this._dataCalcChecksum(t-1);return this},s.prototype.rows=function(t){return arguments.length?(this.row(0,t[0]),this._data=t.filter(function(t,r){return r>0}),this._dataCalcChecksum(),this):[this.row(0)].concat(this._data)},s.prototype.column=function(t,r){return arguments.length<2?[this.fields()[t].label()].concat(this._data.map(function(r,e){return r[t]})):(r.forEach(function(e,n){0===n?this.fields()[t]=(new i).label(r[0]):(this._data[n-1][t]=e,this._dataCalcChecksum(n-1))},this),this)},s.prototype.columnData=function(t,r){return arguments.length<2?this._data.map(function(r,e){return r[t]}):(r.forEach(function(r,e){this._data[e][t]=r,this._dataCalcChecksum(e)},this),this)},s.prototype.columns=function(t){return arguments.length?(t.forEach(function(r,e){this.column(e,t[e])},this),this):this.fields().map(function(t,r){return this.column(r)},this)},s.prototype.cell=function(t,r,e){return arguments.length<3?this.row(t)[r]:(0===t?this.fields()[r]=(new i).label(e):(this._data[t][r]=e,this._dataCalcChecksum(t)),this)},s.prototype.grid=function(t){return s.prototype.rows.apply(this,arguments)},s.prototype.hipieMapSortArray=function(t){return t.map(function(t){var r=!1;0===t.indexOf("-")&&(t=t.substring(1),r=!0);var e=this.fieldByLabel(t,!0);return e||console.log("Grid.prototype.hipieMapSortArray:  Invalid sort array - "+t),{idx:e?e.idx:-1,reverse:r}},this).filter(function(t){return t.idx>=0})},s.prototype.hipieMappings=function(r,e){if(e=e||"",!this.fields().length||!this._data.length)return[];var n=[],i=!1;if(r.forEach(function(t,r){var e={groupby:!1,func:"",params:[]};if(t.hasFunction())e.func=t["function"](),"SCALE"===e.func?e.groupby=!0:i=!0,t.params().forEach(function(t){var r=this.fieldByLabel(t,!0);e.params.push(r?r.idx:-1)},this);else{e.groupby=!0;var s=this.fieldByLabel(t.id(),!0);e.params.push(s?s.idx:-1)}n.push(e)},this),i){var s=[];return this.rollup(n.filter(function(t){return t.groupby===!0}).map(function(t){return t.params[0]}),function(r){var e=n.map(function(e){var n=e.params[0],i=e.params[1];switch(e.func){case"SUM":return t.sum(r,function(t){return t[n]});case"AVE":return t.mean(r,function(t){return t[n]/t[i]});case"MIN":return t.min(r,function(t){return t[n]});case"MAX":return t.max(r,function(t){return t[n]});case"SCALE":return console.log("Unexpected function:  "+e.func),t.mean(r,function(t){return t[n]/+i})}return r[0][n]});return s.push(e),e}),s}return this._data.map(function(t){return n.map(function(r){var e=r.params[0],n=r.params[1];switch(r.func){case"SCALE":return t[e]/+n;case"SUM":case"AVE":case"MIN":case"MAX":console.log("Unexpected function:  "+r.func)}return t[e]})})},o.prototype.constructor=o,o.prototype.grid=function(){return this._grid},o.prototype.columns=function(t){return arguments.length?(this._grid.legacyColumns(t),this):this._grid.legacyColumns()},o.prototype.rawData=function(t){return arguments.length?(this._grid.legacyData(t),this):this._grid.legacyData()},o.prototype.formattedData=function(){return this._formattedDataChecksum!==this._grid.checksum()&&(this._formattedDataChecksum=this._grid.checksum(),this._formattedData=this._grid.formattedData()),this._formattedData},o.prototype.parsedData=function(){return this._parsedDataChecksum!==this._grid.checksum()&&(this._parsedDataChecksum=this._grid.checksum(),this._parsedData=this._grid.parsedData()),this._parsedData},o.prototype._whichData=function(t){if(t){if(t.parsed)return this.formattedData();if(t.formatted)return this.formattedData()}return this.rawData()},o.prototype.data=function(t){return o.prototype.rawData.apply(this,arguments)},a.prototype=Object.create(o.prototype),a.prototype.constructor=a,a.prototype.nest=function(){if(this._nestChecksum!==this._grid.checksum()){this._nestChecksum=this._grid.checksum();var r=t.nest();this._columnIndicies.forEach(function(t){r.key(function(r){return r[t]})}),this._nest=r.rollup(this._rollup)}return this._nest},a.prototype.entries=function(t){return this.nest().entries(this._whichData(t))},a.prototype.map=function(t){return this.nest().map(this._whichData(t))},a.prototype.d3Map=function(r){return this.nest().map(this._whichData(r),t.map)},a.prototype._walkData=function(t,r){r=r||[];var e=[];return t.forEach(function(t){t instanceof Array?e.push(r.concat([t])):e=e.concat(this._walkData(t.values,r.concat([t.key])))},this),e},a.prototype.data=function(t){return this._walkData(this.entries(t))},s.prototype.legacyView=function(){return new o(this)},s.prototype.nestView=function(t){return new a(this,t)},s.prototype.rollupView=function(t,r){return new a(this,t,r)},s.prototype.aggregateView=function(r,e,n,i){var s=this;return new a(this,r,function(r){switch(e){case null:case void 0:case"":return r.aggregate=r.length,r;default:var o=s.legacyColumns(),a=o.indexOf(n),u=o.indexOf(i);return r.aggregate=t[e](r,function(t){return(+t[a]-(u>=0?+t[u]:0))/(u>=0?+t[u]:1)}),r}})},s.prototype._nest=function(r,e){r instanceof Array||(r=[r]);var n=[],i=t.nest();return i.key(function(t){var e="";return r.forEach(function(r){e+=t[r]}),n.push(e),e}).sortKeys(function(t,r){return n.indexOf(t)-n.indexOf(r)}),i},s.prototype.nest=function(t){return this._nest(t).entries(this._data)},s.prototype.rollup=function(t,r){return this._nest(t).rollup(r).entries(this._data)},s.prototype.length=function(){return this._data.length+1},s.prototype.width=function(){return this.fields().length},s.prototype.pivot=function(){return this.resetColumns(),this.rows(this.columns()),this},s.prototype.clone=function(t){return(new s).fields(this.fields(),t).data(this.data(),t)},s.prototype.filter=function(t){var r={};return this.row(0).forEach(function(t,e){r[t]=e}),(new s).fields(this.fields(),!0).data(this.data().filter(function(e){for(var n in t)if(t[n]!==e[r[n]])return!1;return!0}))};var _=null;s.prototype.analyse=function(t){t instanceof Array||(t=[t]);var r=[];return t.forEach(function(t){var e=this.rollup(t,function(t){return t.length});r.push(e);var n=e.map(function(t){return t.key});this.fields()[t].isBoolean=u(n,c),this.fields()[t].isNumber=u(n,h),this.fields()[t].isString=!this.fields()[t].isNumber&&u(n,f),this.fields()[t].isUSState=this.fields()[t].isString&&u(n,y),this.fields()[t].isDateTime=this.fields()[t].isString&&u(n,l),this.fields()[t].isDateTimeFormat=_,this.fields()[t].isDate=!this.fields()[t].isDateTime&&u(n,m),this.fields()[t].isDateFormat=_,this.fields()[t].isTime=this.fields()[t].isString&&!this.fields()[t].isDateTime&&!this.fields()[t].isDate&&u(n,d),this.fields()[t].isTimeFormat=_},this),r},s.prototype.jsonObj=function(t){return arguments.length?(this.clear(),this.data(t.map(function(t,r){var e=[];for(var n in t){var s=this.row(0).indexOf(n);0>s&&(s=this.fields().length,this.fields().push((new i).label(n))),e[s]=t[n]}return e},this)),this):this._data.map(function(t){var r={};return this.row(0).forEach(function(e,n){r[e]=t[n]}),r},this)},s.prototype.json=function(t){return arguments.length?(this.jsonObj(JSON.parse(t)),this):JSON.stringify(this.jsonObj(),null,"  ")},s.prototype.csv=function(r){return arguments.length?(this.jsonObj(t.csv.parse(r)),this):t.csv.formatRows(this.grid())},s.prototype.tsv=function(r){return arguments.length?(this.jsonObj(t.tsv.parse(r)),this):t.tsv.formatRows(this.grid())};var k=[],C=["%Y-%m-%d","%Y%m%d"],b=["%H:%M:%S.%LZ","%H:%M:%SZ","%H:%M:%S"];return C.forEach(function(t){b.forEach(function(r){k.push(t+"T"+r)})}),{Field:i,Grid:s}});