!function(e,t){"function"==typeof define&&define.amd?define(["d3","../common/HTMLWidget","goog!visualization,1,packages:[timeline]"],t):e.google_Timeline=t(e.d3,e.common_HTMLWidget)}(this,function(e,t){function o(){t.call(this),this._chartType="Timeline",this._tag="div",this._data_google=[],this._selection={}}return o.prototype=Object.create(t.prototype),o.prototype.constructor=o,o.prototype._class+=" google_Timeline",o.prototype.publish("tooltipIsHtml",!0,"boolean","Set to false to use SVG-rendered (rather than HTML-rendered) tooltips. See Customizing Tooltip Content for more details.",null,{tags:["Advanced"]}),o.prototype.publish("tooltipTrigger","focus","set","The user interaction that causes the tooltip to be displayed: focus - The tooltip will be displayed when the user hovers over the element; none - The tooltip will not be displayed.",["none","focus"],{tags:["Basic"]}),o.prototype.publish("backgroundColor",null,"html-color","The background color for the main area of the chart. Can be either a simple HTML color string, for example:  or '#00cc00'.",null,{tags:["Basic"]}),o.prototype.publish("avoidOverlappingGridLines",!0,"boolean","Whether display elements (e.g., the bars in a timeline) should obscure grid lines. If false, grid lines may be covered completely by display elements. If true, display elements may be altered to keep grid lines visible.",null,{tags:["Basic"]}),o.prototype.publish("timelineColorByRowLabel",!1,"boolean","If set to true, colors every bar on the row the same. The default is to use one color per bar label.",null,{tags:["Basic"]}),o.prototype.publish("timelineGroupByRowLabel",!0,"boolean","If set to false, creates one row for every dataTable entry. The default is to collect bars with the same row label into one row.",null,{tags:["Basic"]}),o.prototype.publish("timelineShowBarLabels",!0,"boolean","If set to false, omits bar labels. The default is to show them.",null,{tags:["Basic"]}),o.prototype.publish("timelineShowRowLabels",!0,"boolean","If set to false, omits row labels. The default is to show them.",null,{tags:["Basic"]}),o.prototype.publish("timelineSingleColor",null,"html-color","Colors all bars the same. Specified as a hex value (e.g., '#8d8').",null,{tags:["Basic"]}),o.prototype.publish("timePattern","%Y-%m-%d","string","Time format of the data.",null,{tags:["Basic"]}),o.prototype.getChartOptions=function(){var e=[];return e.avoidOverlappingGridLines=this.avoidOverlappingGridLines(),e.backgroundColor=this.backgroundColor(),e.timelineColorByRowLabel=this.timelineColorByRowLabel(),e.timelineGroupByRowLabel=this.timelineGroupByRowLabel(),e.timelineShowBarLabels=this.timelineShowBarLabels(),e.timelineShowRowLabels=this.timelineShowRowLabels(),e.timelineSingleColor=this.timelineSingleColor(),e.tooltipIsHtml=this.tooltipIsHtml(),e.tooltipTrigger=this.tooltipTrigger(),e.width=this.width(),e.height=this.height(),e.timePattern=this.timePattern(),e},o.prototype.data=function(o){var i=t.prototype.data.apply(this,arguments);if(arguments.length){this._data_google=new google.visualization.DataTable,this._data_google.addColumn({type:"string",id:"Label A"}),this._data_google.addColumn({type:"string",id:"Label B"}),this._data_google.addColumn({type:"date",id:"start"}),this._data_google.addColumn({type:"date",id:"end"});var l,a,s=e.time.format(this.timePattern()).parse;o.forEach(function(e){l=s(e[2]),a=s(e[3]),this._data_google.addRows([[e[0],e[1],l,a]])},this)}return i},o.prototype.click=function(e,t,o){console.log("Click:  "+JSON.stringify(e)+", "+t+", "+o)},o.prototype.enter=function(e,o){t.prototype.enter.apply(this,arguments),o.style("overflow","hidden"),this._chart=new google.visualization[this._chartType](e);var i=this;google.visualization.events.addListener(this._chart,"select",function(){var e=i._chart.getSelection()[0];i._selection={data:i.rowToObj(i.data()[e.row]||{}),column:i.columns()[e.column]||null},i.click(i._selection.data,i._selection.column,0!==Object.keys(i._selection).length)})},o.prototype.update=function(e,o){t.prototype.update.apply(this,arguments),this._chart.draw(this._data_google,this.getChartOptions())},o});