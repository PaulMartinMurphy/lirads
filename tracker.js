//
// (c) 2015 Paul Murphy
//

//
// DATE
//

function lirads_compare_index(a,b) {
 var ia = parseInt(radlibs_get_path(a,'ix','0'));
 var ib = parseInt(radlibs_get_path(b,'ix','0'));
 return ia - ib;
} // radlibs_compare_ix

function lirads_tracker_parse_us_date(s) {
  var v = (s === "Not specified") ? ['6','6','6'] : s.split('/');
  return new Date(v[2],v[0],v[1]);
} // lirads_parse_us_date

function lirads_tracker_compare_caption_us_date(a,b) {
  var x = lirads_tracker_parse_us_date(a.caption);
  var y = lirads_tracker_parse_us_date(b.caption);
  return x.getTime() - y.getTime();
} // lirads_compare_caption_date

//
// LRCAT COLORS
//

function lirads_tracker_get_color_for_lrcat(lrcat) {

  if( lrcat === 'LR-1' ) {
    return '#00c300';
  } else if( lrcat === 'LR-2' ) {
    return '#8ded00';
  } else if( lrcat === 'LR-3' ) {
    return '#ffff00';
  } else if( lrcat === 'LR-4' ) {
    return '#ff7700';
  } else if( lrcat === 'LR-5' ) {
    return '#ff0000';
  } else if( lrcat === 'LR-5V' ) {
    return '#ff0000';
  } else if( lrcat === 'LR-5M' ) {
    return '#820000';
  } else if( lrcat === 'Low' ) {
    return '#9900ff';
  } else if( lrcat === 'Moderate' ) {
      return '#cc00ff';
  } else if( lrcat === 'High' ) {
      return '#ff00ff';
  } else if( lrcat === 'Resolved' ) {
      return 'lightgray';
  } else {
    console.log('unrecognized lrcat:');
    console.log(lrcat);
  }

  return 'black';

} // lirads_tracker_get_color_for_lrcat

function lirads_tracker_get_lrcat(obs) {
  if( obs.type === 'Untreated' && RLHP(obs,'lr')) return obs.lr;
  else if( obs.type === 'Treated' && RLHP(obs,'sr')) return obs.sr;
  else if( obs.type === 'Resolved' ) return 'Resolved';
  else return '';
} // lirads_tracker_get_lrcat

//
// DATA AND DATES
//

var global_lirads_features = [
  {code:'type',label:"Status"},
  {code:'sr',label:"Susp. recur."},
  {code:'lr',label:"LI-RADS Cat."},
  {code:'se',label:"Segment(s)"},
  {code:'sz',label:"Size (mm)"},
  {code:'gr',label:"Growth"},
  {code:'ah',label:"Art. hyperenh."},
  {code:'wa',label:"Washout"},
  {code:'ca',label:"Capsule"}
]; // global_lirads_features

var global_summary_features = [
  {prefix:'ts', code:'ts',label:"Tumor stage"}
]; // global_lirads_features

var global_lirads_tracker_dates = [];
var global_lirads_tracker_data  = {};
var global_lirads_tracker_latest_lrcat = {};

function lirads_update_data_from_records(records) {

  var dates = [];
  var data = {};
  var latest_lrcat = {};

  for( var k in records ) {

    var json = records[k].json;

    dates[k] = {field:('date'+k), caption:radlibs_get_path(json,'ex.da','Not specified') }



    var obs = [];
    if( RLHP(json,'ou') ) for( var i in json.ou ) { var o = json.ou[i]; o.type = 'Untreated'; obs.push(o); }
    if( RLHP(json,'ot') ) for( var i in json.ot ) { var o = json.ot[i]; o.type = 'Treated';   obs.push(o); }
    if( RLHP(json,'or') ) for( var i in json.or ) { var o = json.or[i]; o.type = 'Resolved';  obs.push(o); }
    obs.sort(lirads_compare_index);

    for( var i in obs ) {
      if( RLHP(obs[i],'ix')) {
        var ix = obs[i].ix;
        if( !RLHP(data,ix) ) data[ix] = {};
        for( var j in global_lirads_features ) {
          if( RLHP(obs[i],global_lirads_features[j].code) ) {
            if( !RLHP(data[ix],j) ) data[ix][j] = {};
            data[ix][j].code      = global_lirads_features[j].code;
            data[ix][j]['date'+k] = obs[i][global_lirads_features[j].code];
          }
        } // j

        var lrcat = lirads_tracker_get_lrcat(obs[i]);
        if( lrcat != '' ) {
          var cur_time = lirads_tracker_parse_us_date(dates[k].caption).getTime();
          if( !RLHP(latest_lrcat,ix) ) {
            latest_lrcat[ix] = {time:cur_time, lrcat:lrcat};
          } else {
            if( cur_time - latest_lrcat[ix].time > 0 ) {
              latest_lrcat[ix] = {time:cur_time,lrcat:lrcat};
            }
          }
        }

      } // ix
    } // i

    var ix = '*';
    for( var j in global_summary_features ) {
      var prefix = global_summary_features[j].prefix;
      var code   = global_summary_features[j].code;
      if( RLHP(json,prefix) && RLHP(json[prefix],code) ) {
        if( !RLHP(data,ix))    data[ix] = {};
        if( !RLHP(data[ix],j)) data[ix][j] = {};
        data[ix][j].code = global_summary_features[j].code;
        data[ix][j]['date'+k] = json[prefix][code];
      }
    } // j


  } // k

  latest_lrcat[ix] = {time:0,lrcat:"unk"};

  dates.sort(lirads_tracker_compare_caption_us_date);

  global_lirads_tracker_dates = dates;
  global_lirads_tracker_data  = data;
  global_lirads_tracker_latest_lrcat = latest_lrcat;

  console.log(latest_lrcat);

} // lirads_tracker_update_data_from_json

//
// OBS GRID
//

function lirads_tracker_get_columns_from_dates() {
  var rval = [
    { field:'index',   caption:'Observation', size:'100px', attr:'align=center', resizable:false },
    { field:'feature', caption:'Feature',     size:'100px', attr:'align=right', style:'font-weight:bold;' , resizable:false}
  ];

  for( var k in global_lirads_tracker_dates ) {
    var date = global_lirads_tracker_dates[k];
    date.size = '100%';
    date.resizable = false;//true;//size = ;
    date.attr = 'align=center';
    rval.push( date );
  } // k

  return rval;
} // lirads_tracker_obs_grid_get_columns

function lirads_tracker_get_latest_lrcat( i ) {
  return radlibs_get_path( global_lirads_tracker_latest_lrcat, '' + i + '.lrcat', 'Unknown');
}// lirads_tracker_get_latest_lrcat

function lirads_tracker_get_records_from_data() {
  var records = [];
  for( var i in global_lirads_tracker_data ) {
    var lrcat = lirads_tracker_get_latest_lrcat( i );
    var bgcolor = lirads_tracker_get_color_for_lrcat( lrcat );
    records.push({ recid:records.length, index:i, style:'color:white;text-shadow: 0px 0px 4px black;background-color:' + bgcolor + ';font-size:1.5em;font-weight:bold;' }); // #b6d5fb
  } // i


  /*
  var summary = global_lirads_tracker_summary;
  summary.summary = false;
  summary.recid = records.length;
  summary.index = "Tumor Stage";
  summary.style = 'color:white;text-shadow: 0px 0px 4px black;background-color:' + 'yellow' + ';font-size:1.5em;font-weight:bold;';
  records.push( summary );
  */

  return records;
} // lirads_tracker_get_records_from_data

function lirads_tracker_get_feature_records_from_data( record_i ) {

  var i = record_i.index;

  var features = (i === "*") ? global_summary_features : global_lirads_features;

  var records = [];
  for( var j in global_lirads_tracker_data[i] ) {
    var record = global_lirads_tracker_data[i][j];
    record.recid = records.length;
    record.feature = features[j].label;
    records.push( record );
  } // j
  return records;

} // lirads_tracker_get_feature_records_from_data

function lirads_tracker_update_obs_from_data() {

  w2ui['obs_grid'].clear();
  w2ui['obs_grid'].columns = lirads_tracker_get_columns_from_dates();
  w2ui['obs_grid'].records = lirads_tracker_get_records_from_data();
  w2ui['obs_grid'].refresh();

} // lirads_tracker_update_obs_from_data

//
// OBSERVATION GRID
//
function lirads_database_query_remote_event(e) {
  lirads_database_query_remote();
}

function lirads_database_query_remote() {
	var mrn  = $('#lirads-mrn').val();
	var slug = "lirads";

  console.log('lirads_database_query_remote');
  console.log(mrn);
  console.log(slug);

	$('#radlibs-query-mrn').val( mrn );
	$('#radlibs-query-slug').val( slug );

	var f = $('#radlibs-query-form');
  $.ajax({
		type: f.attr('method'),
		url:  f.attr('action'),
		data: f.serialize(),
		//async: false,
		success: function (data) {
      console.log('success');
      console.log(data);
			lirads_database_set_records( JSON.parse(data) );
		},
		error: function(data) {
			radlibs_popup('Failed query, with MRN=' + mrn + ', slug=' + slug);
		}
	});

	return []; // will be set asynchronously above

} // radlibs_database_delete_remote

function lirads_database_set_records(records) {

  for( var i in records ) {
    records[i].string = JSON.stringify( records[i].json );
  }

	w2ui['database_grid'].clear();
	w2ui['database_grid'].records = records;
	w2ui['database_grid'].refresh();
  w2ui['database_grid'].selectAll();

  lirads_tracker_showhide(null);
} // radlibs_database_set_records_async

function lirads_database_on_select() {

  var recids = w2ui['database_grid'].getSelection();

  var records = [];
  for( var i in recids ) {
    var record = w2ui['database_grid'].get(recids[i]);
    records.push( record );
    console.log(record);
  }

  lirads_update_data_from_records(records);
  lirads_tracker_update_obs_from_data();

} // lirads_database_update_obs_from_selection

//
// INIT
//

//var global_lirads_show = false;

function lirads_tracker_show(event) {
  var records = w2ui['obs_grid'].records;
  for( var i in records ) {
    w2ui['obs_grid'].expand( records[i].recid );
  } //i
  //w2ui['obs_grid'].refresh();
  setTimeout(function () { w2ui['obs_grid'].resize(); }, 600 );
} // lirads_tracker_show

function lirads_tracker_hide(event) {
  var records = w2ui['obs_grid'].records;
  for( var i in records ) {
    w2ui['obs_grid'].collapse( records[i].recid );
  } //i
  setTimeout(function () { w2ui['obs_grid'].resize(); }, 600 );
  //w2ui['obs_grid'].refresh();
} // lirads_tracker_hide

function lirads_tracker_showhide(event) {
    if( w2ui['layout_main_toolbar'].get('hide').checked) {
      lirads_tracker_hide(event);
    } else if( w2ui['layout_main_toolbar'].get('show').checked) {
      lirads_tracker_show(event);
    }
} //

function radlibs_app_init() {

  radlibs_toolbar('main',[
    { type: 'html', id: 'title', html: '<div class="radlibs-logo">Tracker</div>' },
    { type: 'break', id: 'break-lirads-tracker-main-0' },
    { type: 'radio',  id: 'show',  group: 'showhide', caption: 'Show', onClick:lirads_tracker_show },
    { type: 'radio',  id: 'hide',  group: 'showhide', caption: 'Hide', onClick:lirads_tracker_hide, checked:true }
    /*
    { type: 'button',  id: 'show', caption: 'Show', onClick:lirads_tracker_show, hint:'Show all observations' },
    { type: 'button',  id: 'hide', caption: 'Hide', onClick:lirads_tracker_hide, hint:'Hide all observations' }
    */
  ]);

  w2ui['layout'].showToolbar('main');
  w2ui['layout'].content('main', '<div id="obs_grid" style="width:100%;height:100%"></div>');
  w2ui['layout'].show('main', true);

  $('#obs_grid').w2grid({
    name   : 'obs_grid',
    columns: lirads_tracker_get_columns_from_dates([]),
    show: {
      header:       false,
      columnHeaders:true,
      toolbar:      false,
      footer:       false,
      lineNumbers:  false,
      selectColumn: false,
      expandColumn: true
    },
    records: [],
    onExpand:function(event) {
      var name = 'obs_subgrid_' + event.recid;
      var record = this.records[ event.recid ];
      if (w2ui.hasOwnProperty(name)) w2ui[name].destroy();
      var records = lirads_tracker_get_feature_records_from_data( record )
      $('#'+ event.box_id).css({ margin: '0px', padding: '0px', width: '100%' }).animate({ height: '' + (26*records.length) + 'px' }, 100);
      setTimeout(function () {
        $('#'+ event.box_id).w2grid({
          name: name,
          show: { columnHeaders: false },
          fixedBody: true,
          columns: lirads_tracker_get_columns_from_dates( global_lirads_tracker_dates ),
          records:records,
        });
        w2ui[name].resize();
      }, 300); // XXX this number has to be big enough to let the html get rendered i think
      setTimeout(function () {
        w2ui['obs_grid'].resize();
      }, 600);
    } // onExpand

  });

  // Bottom
  radlibs_toolbar('bottom',[
    { type: 'html',  id: 'json_title', html: '<div class="radlibs-logo">Database</div>' },
    { type: 'break', id: 'break_bottom' },
    //{ type: 'button', id: 'database',  caption: 'Download',  onClick:lirads_tracker_json_database,  hint:'Download strings from remote database' },
    //{ type: 'html',   id: 'mrn', html: 'MRN: <input id="lirads-tracker-mrn" size="10"></input>', hint:'Specify the medical record number'}
    { type:'html', id:'mrn', html:'MRN:<input id="lirads-mrn" size="10" style="padding: 3px; border-radius: 25px; border: 1px solid silver" onchange="lirads_database_query_remote();"/>' }
  ]);
  w2ui['layout'].showToolbar('bottom');
  w2ui['layout'].content('bottom', '<div id="database_grid" style="width:100%;height:100%"></div>');

  var where = "Remote Server";
  // XXX badly in need of refactoring...
  $('#database_grid').w2grid({
    name   : 'database_grid',
    columns: [
      { field: 'recid',  caption: 'Recid', size:'9',  hidden: true},
      { field: 'pk',     caption: 'Primary key', size:'9', sortable:true, hidden:true},
      { field: 'mrn',    caption: 'MRN', size: '9', sortable:true },
      { field: 'acc',    caption: 'ACC', size: '9', sortable:true },
      { field: 'slug',   caption: 'Form',  size: '9', sortable:true },
      { field: 'string', caption: 'String', size: '90%' },
      { field: 'user',   caption: 'Author', size: '9', sortable:true },
      { field: 'timestamp', caption: 'Timestamp', size: '9', sortable:true }
    ],
    show: {
      header         : false,  // indicates if header is visible
      toolbar        : true,  // indicates if toolbar is visible
      footer         : false,  // indicates if footer is visible
      columnHeaders  : true,   // indicates if columns is visible
      lineNumbers    : false,  // indicates if line numbers column is visible
      expandColumn   : false,  // indicates if expand column is visible
      selectColumn   : true,  // indicates if select column is visible
      emptyRecords   : true,   // indicates if empty records are visible
      toolbarReload  : true,   // indicates if toolbar reload button is visible
      toolbarColumns : false,   // indicates if toolbar columns button is visible
      toolbarSearch  : true,   // indicates if toolbar search controls are visible
      toolbarAdd     : false,   // indicates if toolbar add new button is visible
      toolbarEdit    : false,   // indicates if toolbar edit button is visible
      toolbarDelete  : true,   // indicates if toolbar delete button is visible
      toolbarSave    : false,   // indicates if toolbar save button is visible
      selectionBorder: false,   // display border arround selection (for selectType = 'cell')
      recordTitles   : false,   // indicates if to define titles for records
      skipRecords    : false    // indicates if skip records should be visible
    },
    toolbar : {

    },
    records: [],
    msgDelete:("Are you sure you want to delete selected string(s) from " + where.toLowerCase()),
    onDelete: function(event) {
      if( event.force ) {
        event.isCancelled = true;
        var recids = this.getSelection();
        var pks = [];
        for( var i in recids ) {
          pks.push( this.get(recids[i]).pk )
        }
        lirads_database_delete_remote(pks);


        setTimeout( function() {
          this.onReload(event);
        }, 300 );
      }
    }, // onDelete
    onReload: function(event) {
      lirads_database_query_remote();
    },
    onClick: function (event) {
      event.onComplete = lirads_database_on_select;
    },
    onSelect: function (event) {
      event.onComplete = lirads_database_on_select;
    },
    onUnselect: function (event) {
      event.onComplete = lirads_database_on_select;
    },
  });

  w2ui['layout'].sizeTo('bottom',300);
  w2ui['layout'].set('bottom',{resizable:true});
  w2ui['layout'].show('bottom', true);

  // Right
  radlibs_toolbar('right',[]);
	w2ui['layout'].hideToolbar('right');
  w2ui['layout'].hide('right', true);

  window.onresize = lirads_on_resize_window;
  lirads_on_resize_window();

} // lirads_app_init

function lirads_on_resize_window() {
  //radlibs_report_set_width();
  $('#layout').height(window.innerHeight - 20);
} // radlibs_on_resize_window


function lirads_database_delete_remote(pks) {
	for( var i in pks ) {
		$('#radlibs-delete-pk').val( pks[i] );
		var f = $('#radlibs-delete-form');
		$.ajax({
			type: f.attr('method'),
			url:  f.attr('action'),
			data: f.serialize(),
			success: function (data) {
			},
			error: function(data) {
				radlibs_popup('Failed to delete pk=' + pks[i]);
			}
		});
	} // i
} // radlibs_database_delete_remote
