//
// (c) 2015 Paul Murphy
//

function lirads_get_max_size(sizexsize) {
	return Math.max.apply(null,radlibs_apply(sizexsize.split('x'),parseInt));
} // lirads_max_size

function lirads_get_suggested_category_helper(sz,gr,ah,wa,ca,tv,nm) {

	nm = nm === 'Yes' || nm === 'New'; // non-hcc malignancy
	tv = tv === 'Yes' || tv === 'New'; // tumor in vein

	if( nm ) return 'LR-5M';
	if( tv ) return 'LR-5V';

	var d = lirads_get_max_size( sz );

	console.log(d);

	ah = ah === 'Yes' || ah === 'New'; // arterial hyperenhancement
	wa = wa === 'Yes' || wa === 'New'; // washout
	ca = ca === 'Yes' || ca === 'New'; // capsule appearance
	gr = gr === 'Threshold'; // threshold growth

	var sum = wa + ca + gr;
	if( !ah ) {
		if( d < 20 ) {
			switch(sum) {
				case 0: return 'LR-3';
				case 1: return 'LR-3';
				default:
				case 2: return 'LR-4';
			}
		} else { // d >= 20 }
			switch(sum) {
				case 0: return 'LR-3';
				case 1: return 'LR-4';
				default:
				case 2: return 'LR-4';
			}
		}
	} else { // ah
		if( d < 10 ) {
			switch(sum) {
				case 0: return 'LR-3';
				case 1: return 'LR-4';
				default:
				case 2: return 'LR-4';
			}
		} else if( 10 <= d && d < 20 ) {
			switch(sum) {
				case 0: return 'LR-3';
				case 1: return 'LR-4/5';
				default:
				case 2: return 'LR-5';
			}
		} else { // d >= 20 }
			switch(sum) {
				case 0: return 'LR-4';
				case 1: return 'LR-5';
				default:
				case 2: return 'LR-5';
			}
		}
	}

	return '...';

} // lirads_get_suggested_category_helper

function lirads_set_suggested_category(obs,i) {

	var sz = radlibs_get_path(obs,'sz','0');
	var gr = radlibs_get_path(obs,'gr','');
	var ah = radlibs_get_path(obs,'ah','');
	var wa = radlibs_get_path(obs,'wa','');
	var ca = radlibs_get_path(obs,'ca','');
	var tv = radlibs_get_path(obs,'tv','');
	var nm = radlibs_get_path(obs,'nm','');

	var su = '(' + lirads_get_suggested_category_helper(sz,gr,ah,wa,ca,tv,nm) + ')';

	var index = "#ou-" + i + "-su";
	$(index).val( su );

} // lirads_get_suggested_category

function lirads_get_time_from_us_date(da) {
	var s = da.split('/');
	return new Date(s[2],s[0]-1,s[1],0,0,0,0);
} // function

function lirads_set_suggested_growth(json,obs,i) {

	var index = "#ou-" + i + "-sg";

	if( !(radlibs_has_path(json,'ex.da') && radlibs_has_path(json,'ex.pd') && RLHP(obs,'sz') && RLHP(obs,'ps')) ) {
		$(index).val('');
		return;
	}

	var SIX_MONTHS = 6 * 29 * 24 * 60 * 60 * 1000; // d/m * h/d * m/h * s/m * ms/s
	var t0 = lirads_get_time_from_us_date(json.ex.pd);
	var t1 = lirads_get_time_from_us_date(json.ex.da);
	var dt = t1-t0;

	var d0 = lirads_get_max_size(obs.ps);
	var d1 = lirads_get_max_size(obs.sz);
	var ratio = d1/d0;

	if( d1 === d0 ) {
		sg = "Stable";
	} else if( d1 < d0 ) {
		sg = "Smaller";
	} else if( (d0 === 0 && d1 >= 10) ||
	 					 (d0 !== 0 && ratio >= 1.5 && dt <= SIX_MONTHS) ||
						 (d0 !== 0 && ratio >= 2.0 && dt > SIX_MONTHS) ) {
		sg = "Threshold";
	} else {
		sg = "Subthreshold";
	}

	$(index).val( sg );

} // lirads_get_suggested_growth

/*
T1: One 10-19mm LR5 observation.
•T2: One 20-50mm LR5 observation OR two to three 10-29mm LR5 observations.
•T3: One >50mm LR5 observation OR two to three LR5 observations at least one of which is > 30mm.
•T4a: At least four >10mm LR5 observations.
•With caution, radiologists may assign a radiologic T-stage 4a to a patient with innumerable LR4 observations that, while individually not meeting LR5 criteria, in aggregate are interpreted as definite multifocal HCC.
•The presence of tumor in vein (LR5V) denotes radiologic T-stage 4b, regardless of the size or number of individual observations
Tumor in vein
*/

function lirads_set_selected_tstage(json) {

	console.log('lirads-set-selcted-tstage');

	var index = "#ts-st";

	if( !RLHP(json,'ou') ) {
		$(index).val('');
	}

	var lr5 = 0;
	var lr5v = 0;
	var lr5_10_20 = 0;
	var lr5_10_30 = 0;
	var lr5_gt10 = 0;
	var lr5_gt30 = 0;
	var lr5_gt50 = 0;

	for( var i in json.ou ) {
		var obs = json.ou[i];
		if( obs.lr === "LR-5V" ) lr5v++;
		if( obs.lr === "LR-5"  ) lr5++;

		if( (obs.lr === "LR-5V" || obs.lr === "LR-5") && RLHP(obs,'sz') ) {
			var d = lirads_get_max_size( obs.sz );
			if( 10 <= d && d < 20 ) lr5_10_20++;
			if( 10 <= d && d < 30 ) lr5_10_30++;
			if( 10 <= d ) lr5_gt10++;
			if( 30 <= d ) lr5_gt30++;
			if( 50 <= d ) lr5_gt50++;
		}
	} // i

	var st = '';

	if( lr5v > 0 ) {
		st = "T4b";
	} else if( lr5_gt10 >= 4 ) {
		st = "T4a";
	} else if ( lr5_gt50 === 1 || ((lr5 === 2 || lr5 === 3) && lr5_gt30 >= 1 ) ) {
		st = "T3";
	} else if( lr5_gt30 === 1 || (lr5_10_30 === 2 || lr5_10_30 === 3) ) {
		st = "T2";
	} else if( lr5_10_20 === 1 ) {
		st = "T1";
	}

	console.log(lr5);
	console.log(lr5v);
	console.log(lr5_10_20);
	console.log(lr5_10_30);
	console.log(lr5_gt10);
	console.log(lr5_gt30);
	console.log(lr5_gt50);
	console.log(st);

	$(index).val(st);

} // lirads_set_selected_tstage

function lirads_segments_helper(obs) {
	obs['se_helper'] = "Segment" + radlibs_pluralize(obs['se']) + ': ' + radlibs_conjunction( obs['se'], 'not specified' );
} // lirads_segments_helper

function lirads_untreated_helper(obs) {

	var feature_labels = {
		'ah':'arterial hyperenhancement',
		'wa':'washout',
		'ca':'capsule',
		'tv':'tumor in vein'};

	var pos_features = [];
	var neg_features = [];
	var new_features = [];

	for( var j in feature_labels ) {
		if( RLHP(obs,j) ) {
			if( obs[j] === 'Yes' ) {
				pos_features.push( feature_labels[j] );
			} else if( obs[j] === 'New' ) {
				pos_features.push( feature_labels[j] );
				new_features.push( 'new ' + feature_labels[j] );
			} else if( obs[j] === 'No' ) {
				neg_features.push( 'no ' + feature_labels[j] );
			}
		}
	}

	obs['mf_helper'] = radlibs_conjunction( pos_features.concat(neg_features), 'not specified' );
	obs['nf_helper'] = radlibs_conjunction( new_features, 'not specified' );
	if( RLHP(obs,'af') ) obs['af_helper'] = radlibs_conjunction( radlibs_uncapitalize(obs['af']) );

} // lirads_features_helper

function lirads_aggregate_helper(obs) {

	var w_num = RLHP(obs,'ca') && (obs.ca === "Numerous");
	var w_ext = RLHP(obs,'ca') && (obs.ca === "Extensive");

	obs['ca_helper'] =
		(w_num ? "There are numerous similar observations" :
		(w_ext ? "There is an extensive observation" :
		"There is an aggregate observation"));

	if( RLHP(obs,'se')) obs['se_helper'] = "segment" + radlibs_pluralize(obs.se) + ' ' + radlibs_conjunction(obs.se);
	if( RLHP(obs,'sz')) obs['sz_helper'] = "measuring " + (w_num ? "up to " : "") + obs.sz + " mm";
	if( RLHP(obs,'lo')) obs['lo_helper'] = radlibs_uncapitalize(obs.lo);
	if( RLHP(obs,'mf')) obs['mf_helper'] = radlibs_conjunction( radlibs_uncapitalize(obs.mf) );
	if( RLHP(obs,'af')) obs['af_helper'] = radlibs_conjunction( radlibs_uncapitalize(obs.af) );

} // lirads_aggregate_features_helper

function radlibs_render(json, update_form) {

	var rval = '';

	var template;

	if( radlibs_has_path(json,'hv.pv') ) json['hv']['pv_helper'] = radlibs_conjunction(json['hv']['pv']);
	if( radlibs_has_path(json,'hv.hv') ) json['hv']['hv_helper'] = radlibs_conjunction(json['hv']['hv']);
	//json['pv_helper'] = radlibs_conjunction(json['li.pv'])

	template =
		"TECHNIQUE:\n" +
		"Multiple {{ te.mo }}{{# te.mo }} {{/te.mo}}images of the abdomen were obtained{{#te.cn}} after the intravenous administration of {{#te.vc}}{{ te.vc }} mL of {{/te.vc}}{{ te.cn }} contrast{{ #te.rc }} at {{ te.rc }} mL/sec{{/te.rc}}{{/te.cn}}. {{ te.co }}\n" +
		"\n" +
		"FINDINGS:\n" +
		"LIVER:\n" +
		"Morphology: {{li.mo}}{{^li.mo}}Unremarkable{{/li.mo}}\n" +
		"Cirrhosis: {{li.ci}}{{^li.ci}}No{{/li.ci}}\n" +
		"Steatosis: {{li.st}}{{^li.st}}No{{/li.st}}\n" +
		"Iron Overload: {{li.fe}}{{^li.fe}}No{{/li.fe}}\n" +
		'Ascites: {{li.as}}{{^li.as}}None{{/li.as}}\n' +
		'Hepatic arterial anatomy: {{hv.ha}}{{^hv.ha}}Standard{{/hv.ha}}\n' +
		'Portal veins: {{hv.pv_helper}}{{^hv.pv}}Patent{{/hv.pv}}\n' +
		'Hepatic veins: {{hv.hv_helper}}{{^hv.hv}}Patent{{/hv.hv}}\n' +
		'Varices: {{hv.va}}{{^hv.va}}None{{/hv.va}}\n' +
		'{{ #hv.sr }}Splenorenal shunt: {{ hv.sr }}\n{{/hv.sr}}' +
		'{{ #hv.rp }}Recanalized periumbilical vein: {{ hv.rp }}\n{{/hv.rp}}' +
		'Comments:{{# li.co }} {{li.co}}{{/li.co}}{{# hv.co}} {{hv.co}}{{/hv.co}}{{^li.co}}{{^hv.co}} None{{/hv.co}}{{/li.co}}\n' +
		'\n';
	rval += Mustache.to_html(template,json);

	if( RLHP(json,'ou') ) {
		rval += 'Untreated observations:\n';

		template =
			"Observation {{ ix }}{{^ix}}not specified{{/ix}}, {{ se_helper }}, Series and image: {{ sn }}{{^sn}}not specified{{/sn}}, Size: {{#sz}}{{ sz }} mm{{/sz}}{{^sz}}not specified{{/sz}}, {{ lr }}{{^lr}}LR not specified{{/lr}}{{#co}}, {{ co }}{{/co}}\n" +
			"Observation features: {{ mf_helper }}. {{# af_helper }}Also has {{ af_helper }}{{/af_helper}}\n" +
			"Observation feature stability: {{ nf_helper }}.\n" +
			"Observation size stability: {{ gr }}{{^gr}}not specified{{/gr}}\n\n";

		for( var i in json['ou'] ) {
			var obs = json['ou'][i];
			lirads_segments_helper(obs);
			lirads_untreated_helper(obs);

			if( update_form ) {
				lirads_set_suggested_category(obs,i);
				lirads_set_suggested_growth(json,obs,i);
			}

			rval +=  Mustache.to_html( template, obs );
		}
	} // ou

	if( RLHP(json,'ot') ) {
		rval += 'Treated observations:\n';

		template =
			"Observation {{ ix }}{{^ix}}not specified{{/ix}}, {{ se_helper }}, Series and image: {{ sn }}{{^sn}}not specified{{/sn}}, Pre-treatment: {{ lr }}{{^lr}}LR not specified{{/lr}}, Suspicion for recurrence: {{ sr }}{{^sr}}not specified{{/sr}}{{#co}}, {{ co }}{{/co}}\n" +
			"{{# sz }}Size of residual arterial enhancement: {{ sz }} mm\n{{/sz}}" +
			"{{# cs }}Size of treatment cavity: {{ cs }} mm\n{{/cs}}\n\n";

		for( var i in json['ot'] ) {
			var obs = json['ot'][i];
			lirads_segments_helper(obs);
			rval +=  Mustache.to_html( template, obs );
		}
	} // ot

	if( RLHP(json,'or') ) {
		rval += 'Resolved observations:\n';

		template =
			"Observation {{ ix }}{{# rd }}, resolved on {{{ rd }}}{{/rd}}{{# co }}, {{ co }}{{/co}}\n";

		for( var i in json['or'] ) {
			var obs = json['or'][i];
			rval +=  Mustache.to_html( template, obs );
		}
		rval += '\n';
	}

	if( RLHP(json,'oa')) {

		var obs = json['oa'];

		//obs['me_helper'] = w ? "measuring up to" : "measuring";

		lirads_aggregate_helper(obs);

		template = "Aggregate observation: {{ca_helper}}{{# lo_helper }}, involving the {{ lo_helper }}{{/lo_helper}}{{# se_helper }} in {{ se_helper }}{{/ se_helper }}{{# sz_helper }} {{sz_helper}},{{/sz_helper}}{{#mf_helper}}, with {{ mf_helper }}{{/mf_helper }}{{# af_helper }}, as well as {{af_helper}}{{/ af_helper }}, with LI-RADS category {{lr}}{{^lr}}not specified{{/lr}}.{{# co }} {{ co }}{{/ co }}\n\n"
		rval += Mustache.to_html(template, obs);
	}

	var LIRADS_SPLENOMEGALY_THRESHOLD = 12; // cm

	if( radlibs_has_path(json,'sp.sz') ) {
		json.sp['sz_helper'] = (json.sp.sz > LIRADS_SPLENOMEGALY_THRESHOLD) ? 'enlarged' : 'unenlarged';
	}

	template =
		'SPLEEN: {{ #sp.sz }}{{ sp.sz}} cm, {{sp.sz_helper}}.{{/sp.sz}}{{^sp.sz}}Unremarkable{{/sp.sz}}{{# sp.co }} {{ sp.co }}{{/ sp.co }}\n\n';
	rval += Mustache.to_html(template,json);

	rval += "IMPRESSION:\n";
	var n = 0;

	// LI-RADS
	rval += '' + (++n) + '. ';
	if( RLHP(json,'oa') || RLHP(json,'ou') || RLHP(json,'ot') ) {
		rval += "LI-RADS Observations:\n";

		template =  "Aggregate observation, {{ lr }}{{^lr}}LR not specified{{/lr}}\n";
		if( RLHP(json,'oa') ) rval += Mustache.to_html(template, json.oa);

		if( RLHP(json,'ou') )	{
			template =  "Observation {{ ix }}{{^ix}}not specified{{/ix}}, {{ lr }}{{^lr}}LR not specified{{/lr}}\n";
			for( var i in json['ou'] ) rval += Mustache.to_html(template, json['ou'][i]);
		}

		if( RLHP(json,'ot') ) {
			template =  "Observation {{ ix }}{{^ix}}not specified{{/ix}}, {{#sr}}{{ sr }} suspicion for recurrence{{/sr}}{{^sr}}Suspicion for recurrence not specified{{/sr}}\n";
			for( var i in json['ot'] ) rval += Mustache.to_html(template, json['ot'][i]);
		}

	} else {
		rval += "No reportable LI-RADS observations.\n";
	}
	rval += "\n";

	if( update_form ) {
		lirads_set_selected_tstage(json);
	}
	if( RLHP(json,'ts') ) {
		rval += '' + (++n) + '. ';
		template =
			'Radiologic tumor stage: {{ ts.ts }}{{^ts.ts}}not specified{{/ts.ts}}.{{ #ts.re }} {{ ts.re }}.{{/ ts.re }}{{ #ts.co }} {{ ts.co }}.{{/ ts.co }}\n\n';
		rval += Mustache.to_html(template,json);
	}


	// Cirrhosis & portal hypertension
	var phtn = [];
	if( radlibs_has_path(json,'li.as') && json.li.as !== "None") phtn.push( radlibs_uncapitalize(json.li.as) + ' ascites');
	if( radlibs_has_path(json,'hv.va') && json.hv.va.length > 0 ) phtn.push( radlibs_conjunction(radlibs_uncapitalize(json.hv.va),"") + ' varices');
	if( radlibs_has_path(json,'sp.si') && json.sp.si > LIRADS_SPLENOMEGALY_THRESHOLD ) phtn.push( 'splenomegaly' );

	if( radlibs_has_path(json,'li.ci') && json.li.ci !== "No") {
		rval += '' + (++n) + '. ' + ((json.li.ci === "Definite") ? "Cirrhosis" : (json.li.ci + " cirrhosis"));

		if( phtn.length !== 0 ) {
			rval += " with evidence of portal hypertension including " + radlibs_conjunction( phtn ) + ".";
		} else {
			rval += " without evidence of portal hypertension.";
		}
		rval += ".\n\n";
	} else if( phtn.length !== 0 ) {
		rval += '' + (++n) + '. ' + radlibs_capitalize(radlibs_conjunction(phtn)) + ".\n\n";
	}

	// Steatosis
	if( radlibs_has_path(json,'li.st') && json.li.st != "No" ) {
		rval += '' + (++n) + '. ' + ((json.li.st === "Definite") ? "Hepatic steatosis." : (json.li.st + " hepatic steatosis."));
	}

	/*
	"Multiple similar observations:
	Due to the multiplicity of similar observations, reporting is provided in aggregate rather than by individual observation.
	[Multiple/5-10/11-20/20-50/innumerable] observations involve segments [1/2/3..], [left]/[right] lobe, [entire liver] .
	These measure up to [ ] mm in diameter.
	All or most show [{select major features]] and [{select ancillary features}].
	Individually, most or all of these are categorized LR [ ].
	In aggregate, they are categorized [multi-focal][extensive] LR [ ] [observations/{if LR-1 or LR-2, add} [definite][probable] [{enter most likely entity}]"

	"Extensive observation:
	An extensive [probably] [definitely] malignant observation involves segments [1/2/3..], [left]/[right] lobe, [entire liver].
	There [is no] [is a] dominant component [in segment(s) [1/2/3…][left]/[right] lobe which measures [about] [ ] mm in diameter (series [ ], image [ ])].
	There [is not] [is] definite tumor in vein, [ involving [ ] vein(s)].
	The observation shows  [{select major features]] and [{select ancillary features}]. in aggregate, the observation  is categorized LR [ ]."
	*/


	/*
	Aggregate observation:
	"Observation(s)": ["Numerous similar observations, Innumerable observations, Extensive observation]
	Location(s): 1,2,3,4a,4b,5,6,7,8,right lobe, left lobe,entire liver
	Short axis
	Long axis
	Tumor in vein: Yes, No
	Major features: "Arterial hyperenhancement, "Washout", Capsule
	Ancillary features: ...
	Aggregate LR: LR-1, LR-2, LR-3, LR-4, LR-5, LR-5M, LR-5V
	Comments:
	*/

	return rval;

} // radlibs_render

/*
function lirads_form_init() {

	var name = 'lirads';
	var version = '20150810a';

	//
	// Categorical variable values
	//
	var unrem             = 'Unremarkable';
	//var notspec           = 'not specified';
	var none              = 'None';
	var yesno             = ['Yes','No'];
	var yesnonew          = ['Yes','No','New'];
	var lowmodhigh        = ['Low','Moderate','High'];
	var mildmodsev        = ['Mild','Moderate','Severe'];

	var hep_art_anatomy   = ['Standard','Replaced RHA','Accessory RHA','Replaced LHA','Accessory LHA'];
	var venous_patency    = ['Patent','Compressed','Occluded'];
	//var tumor_in_vein_options = radlibs_concat(['No',radlibs_cross([['Still ','Now '],['abuts ','invades '],['MPV','RPV','LPV','RHV','MHV','LHV']])]);
	var liver_segments    = ['1','2','3','4a','4b','5','6','7','8'];
	var treated_resolved  = ['Untreated','Treated','Resolved'];
	var lirads_categories = ['LR-1','LR-2','LR-3','LR-4','LR-5','LR-5V','LR-5M'];
	var varix_locs        = ['Esophageal','Paraesophageal','Gastric','Paragastric','Splenic'];

	var lirads_splenomegaly_threshold = 14;


  // ---------- EXAM  ----------

	var modalities        = ['CT','MR'];
	var contrast_agents   = ['Omnipaque','Magnevist','Eovist'];

	var exam_section = {label:'Exam',  prefix:'ex',
		fields:[
			{label:'Date',     code:'da', type:'us-date', w2field_type:'date'},
			{label:'Modality', code:'mo', type:'list',    items:modalities, size:9},
			{label:'Contrast', code:'co', type:'combo',   items:contrast_agents},
		],
	};

  // ---------- LIVER ----------

	var liver_morphology  = ['Unremarkable','Nodular'];
	var ascites_volumes   = ['None','Small','Moderate','Massive'];

	var liver_section = {label:'Liver', prefix:'li',
		fields:[
			{label:'Morphology', code:'mo', type:'list', size:20, items:liver_morphology},
			{label:'Ascites',    code:'as', type:'list', size:20, items:ascites_volumes},
			{label:'Comments',   code:'co', type:'textarea', size:40},
		],
		findings:function(json) {
			var template =
			'LIVER:\n'+
			'Morphology: {{li.mo}}{{^li.mo}}Unremarkable{{/li.mo}}\n'+
			'Ascites: {{li.as}}{{^li.as}}None{{/li.as}}\n'+
			'Comments: {{li.co}}{{^li.co}}None{{/li.co}}\n';
			return Mustache.to_html(template,json);
		}, // findings
		impression:function(json) {
			var rval = '';

			// evidence of portal hypertension
			var ph = [];
			if( radlibs_has_path(json,'li.as') && json.li.as != 'None') {
				ph.push(json.li.as.toLowerCase() + ' ascites');
			}
			if( radlibs_has_path(json,'sp.si') && parseInt(json.sp.si) >= lirads_splenomegaly_threshold) {
				ph.push('splenomegaly');
			}
			if( radlibs_has_path(json,'hv.va') ) {
				ph.push( radlibs_conjxn(json.hv.va,'no').toLowerCase() + ' varices');
			}

			if( radlibs_has_path(json,'li.mo') && json.li.mo == 'Nodular' ) {
				rval += 'Cirrhosis';
				if( ph.length > 0 ) {
					rval += ' with evidence of portal hypertension including ' + radlibs_conjxn(ph,'') + '.';
				} else {
					rval += ' without evidence of portal hypertension.';
				}
				rval += '\n\n';
			} else {
				for( var i in ph ) {
					rval += radlibs_capitalize(ph[i]) + '\n\n';
				}
			}

			return rval;
		} // impression
	}; // liver_section

	// ---------- HEPATIC VASCULATURE ----------

	var hepatic_vasculature_section = {label:'Hepatic vasculature', prefix:'hv', hide:true,
		fields:[
			{label:'Varices',            code:'va', type:'enum', items:varix_locs, size:20},
			{label:'Splenorenal shunt',  code:'sr', type:'list', items:yesno},
			{label:'Hep. art. anatomy',  code:'ha', type:'enum', items:hep_art_anatomy, size:20},
			{label:'MPV Diameter (mm)',  code:'pd', type:'int',  size:11},
	   	{label:'Main portal vein',   code:'mp', type:'list', items:venous_patency},
		  {label:'Right portal vein',  code:'rp', type:'list', items:venous_patency},
		  {label:'Left portal vein',   code:'lp', type:'list', items:venous_patency},
		  {label:'Right hepatic vein', code:'rh', type:'list', items:venous_patency},
		  {label:'Middle hepatic vein',code:'mh', type:'list', items:venous_patency},
		  {label:'Left hepatic vein',  code:'lh', type:'list', items:venous_patency},
		],
		findings:function(json) {
			var rval = '';
			rval += 'Hepatic arterial anatomy: ' + radlibs_conjxn(radlibs_get_path(json,'hv.ha',[]),'Standard') + '\n';
			rval += 'Venous patency: ';
			var hv = json.hv;
			if( hv && (hv.mp || hv.rp || hv.lp || hv.mh || hv.rh || hv.lh) ) {
				if( hv.mp || hv.rp || hv.lp ) {
					if( hv.mp ) rval += 'MPV ' + hv.mp + '. ';
					if( hv.rp ) rval += 'RPV ' + hv.rp + '. ';
					if( hv.lp ) rval += 'LPV ' + hv.lp + '. ';
				} else {
					rval += 'Portal veins patent.';
				}
				if( hv.mh || hv.rh || hv.lh ) {
					if( hv.rh ) rval += 'RHV ' + hv.rh + '. ';
					if( hv.mh ) rval += 'MHV ' + hv.mh + '. ';
					if( hv.lh ) rval += 'LHV ' + hv.lh + '. ';
				} else {
					rval += 'Hepatic veins patent. ';
				}
			} else {
				rval += ' Patent';
			}
			rval += '\n';// venous patency
			rval += 'MPV Diameter: ' + radlibs_get_path(json, 'hv.pd', notspec) + (radlibs_has_path(json,'hv.pd') ? 'mm' : '') + '\n';
			rval += 'Varices: ' + radlibs_capitalize(radlibs_conjxn(radlibs_get_path(json,'hv.va',[]),'None').toLowerCase()) + '\n';
			rval += 'Splenorenal shunt: ' + radlibs_get_path(json,'hv.sr','No') + '\n';
			rval += '\n';
			return rval;
		} // findings
	}; // hepatic_vasculature_section

	// ---------- SPLEEN ----------

	var spleen_section = {label:'Spleen', prefix:'sp',
		fields:[
			{label:'Size (cm)', code:'si', type:'int'},
			{label:'Comments',  code:'co', type:'combo', items:['Scattered calcifications']},
		],
		findings:function(json) {
			if( radlibs_has_path(json,'sp.si') ) json.sp.si_helper = (parseInt(json.sp.si) >= lirads_splenomegaly_threshold) ? ', enlarged.' : ', unenlarged.';
			var template = 'SPLEEN: {{^sp}}Unremarkable{{/sp}}{{sp.si}}{{#sp.si}} cm{{/sp.si}}{{sp.si_helper}} {{sp.co}}';
			return Mustache.to_html(template,json);
		} // findings
	}; // spleen_section

  // ---------- OBSERVATIONS ----------

	var malignant_ancillary_features = [
		'Hepatobiliary phase hypointensity',
		'Mild-moderate T2 hyperintensity',
		'Restricted diffusion',
		'Distinctive rim',
		'Corona enhancement',
		'Mosaic architecture',
		'Nodule-in-nodule architecture',
		'Intra-lesional fat',
		'Lesional iron sparing',
		'Lesional fat sparing',
		'Blood products',
	];

	var benign_ancillary_features = [
		'Homogeneous marked T2 hyperintensity',
		'Homogeneous marked T2 or T2* hypointensity',
		'Hepatobiliary phase isointensity',
		'Undistorted vessels',
		'Parallels blood pool enhancement',
	];

	var ancillary_features = radlibs_concat([malignant_ancillary_features,benign_ancillary_features]);

	var growth_categories = [
		'Threshold growth',
		'Subthreshold growth',
		'Stable diameter',
		'Diameter reduction',
	];

	var untreated_section_serial = radlibs_range(1,10);
	var untreated_section = {label:'Untreated Observation', prefix:'ou', short_label:'Obs', serial:untreated_section_serial,
	 	fields:[
			{label:'Index',              code:'ix', type:'int', size:3},
			{label:'LI-RADS Category',   code:'lr', type:'list', items: lirads_categories, size:5},
			{label:'Segment(s)',         code:'se', type:'enum', items: liver_segments, size:20, rotate:"0deg" },
			{label:'Series number',      code:'sn', type:'int',  size:3 },
			{label:'Image number',       code:'in', type:'int',  size:3 },
			{label:'Long axis (mm)',     code:'d1', type:'int',  size:3 },
			{label:'Short axis (mm)',    code:'d2', type:'int',  size:3 },
			{label:'Growth',             code:'gr', type:'list', size:15, items: growth_categories, rotate:"0deg" },
			{label:'Arterial Hyperenh.', code:'ah', type:'list', items: yesnonew},
			{label:'Washout',            code:'wa', type:'list', items: yesnonew},
			{label:'Capsule',            code:'ca', type:'list', items: yesnonew},
			{label:'Tumor in vein',      code:'tv', type:'list', items: yesnonew},
			{label:'Non-HCC Malig.',     code:'nm', type:'list', items: yesno},
			{label:'Suggested LR',       code:'su', type:'text', size:6, disabled:true },
			{label:'Ancillary features', code:'af', type:'enum', size:40, items: ancillary_features, rotate:"0deg" },
			{label:'Comments',           code:'co', type:'text', size:30, rotate:'0deg'},
			//{label:'Other',              code:'ot', type:'text', size:20 },
		],
		findings:function(json) {
			var rval = '';

			if( RLHP(json,'ou') ) {
				var obs = [];
				for( var i in json.ou ) obs.push(json.ou[i]);
				obs.sort(radlibs_compare_ix);

				for( var i in untreated_section_serial ) {
					var su = RLHP(json.ou,i) ? lirads_get_suggested_category(json.ou[i]) : '';
					$( radlibs_id_serial_field('ou',i,'su')).val(su);
				} // i

				var feature_labels = {
					'ah':'arterial hyperenhancement',
					'wa':'washout',
					'ca':'capsule',
					'tv':'tumor in vein'};

				for( var i in obs ) {
					var index = radlibs_attr(obs[i],'ix',notspec);
					var lrcat = radlibs_attr(obs[i],'lr','LR ' + notspec);
					var segments = lirads_get_segments(obs[i]);// 'Segment' + ((RLHP(obs[i],'se') && obs[i].se.length == 1) ? (' ' + obs[i].se[0]) : ('s ' + radlibs_conjxn(obs[i].se, notspec)));
					var seriesimage = lirads_get_series_image(obs[i]);
					var size = (RLHP(obs[i],'d1') || RLHP(obs[i],'d2')) ? ('Size ' + radlibs_join('x',[obs[i].d1,obs[i].d2],'') + ' mm') : '';
					var growth = RLHP(obs[i],'gr') ? obs[i].gr : notspec;
					var comments = radlibs_attr(obs[i],'co','');

					rval += 'Observation ' + radlibs_join(', ',[index,segments,seriesimage,size,lrcat,comments],'') + '\n';

					var pos_features = [];
					var neg_features = [];
					var new_features = [];

					for( var j in feature_labels ) {
						var jtv = j === 'tv';
						if( RLHP(obs[i],j) ) {
							if( obs[i][j] === 'Yes' ) {
								pos_features.push( feature_labels[j] );
							} else if( obs[i][j] === 'New' ) {
								pos_features.push( feature_labels[j] );
								new_features.push( 'new ' + feature_labels[j] );
							} else if( obs[i][j] === 'No' ) {
								neg_features.push( 'no ' + feature_labels[j] );
							}
						}
					}

					var anc_features = RLHP(obs[i],'af') ? ('. Also has ' + radlibs_conjxn( obs[i].af, '' ).toLowerCase()) : '';

					rval += 'Observation features: ' + radlibs_capitalize( radlibs_conjxn( radlibs_concat([pos_features,neg_features]), notspec)) + anc_features + '.\n';
					rval += 'Observation feature stability: ' + radlibs_capitalize(radlibs_conjxn( new_features, notspec)) + '\n';
					rval += 'Observation size stability: ' + radlibs_capitalize(growth) + '\n\n';

				} // i

			}

			if( rval === '' ) {
				return 'Untreated observations: None\n';
			} else {
				return 'Untreated observations:\n\n' + rval;
			}

		}, // findings

		impression:function(json) {
			var rval = '';
			//var resolved  = '';

			var obs = [];
			if( RLHP(json,'ou') ) for( var i in json.ou ) { var o = json.ou[i]; o.type = 'ou'; obs.push(o); }
			if( RLHP(json,'ot') ) for( var i in json.ot ) { var o = json.ot[i]; o.type = 'ot'; obs.push(o); }

			obs.sort(radlibs_compare_ix);

			for( var i in obs ) {
				var ix = radlibs_get_path(obs[i],'ix',notspec);
				var cat = obs[i].type == 'ou' ? radlibs_attr(obs[i],'lr',notspec) : (radlibs_attr(obs[i],'sr',notspec) + ' suspicion for recurrence')
				rval += '- Observation ' + ix + ', ' + cat + '\n';
			}

			if( rval === '' ) {
				return 'No reportable LIRADS observations.\n\n';
			} else {
				return 'LIRADS observations:\n' + rval + '\n';
			}

		} // impression

	}; // untreated_section

	var treated_section = {label:'Treated Observation', prefix:'ot', short_label:'Obs', serial:radlibs_range(1,10),
		fields:[
			{label:'Index',                  code:'ix', type:'int', size:3},
			{label:'Pre-Rx LI-RADS Cat.',    code:'lr', type:'list', items: lirads_categories, size:5},
			{label:'Susp. for recurrence',   code:'sr', type:'list', items: lowmodhigh, size:5},
			{label:'Segment(s)',             code:'se', type:'enum', items: liver_segments, size:20, rotate:"0deg" },
			{label:'Series number',          code:'sn', type:'int',  size:3 },
			{label:'Image number',           code:'in', type:'int',  size:3 },
			{label:'Art. enh. long ax(mm)',  code:'d1', type:'int',  size:3 },
			{label:'Art. enh. short ax(mm)', code:'d2', type:'int',  size:3 },
			{label:'Cavity long ax (mm)',    code:'c1', type:'int',  size:3 },
			{label:'Cavity short ax (mm)',   code:'c2', type:'int',  size:3 },
			{label:'Comments',               code:'co', type:'text', size:30, rotate:'0deg'},
		],
		findings:function(json) {
			var rval = '';
			if( RLHP(json,'ot') ) {
				var obs = [];
				for( var i in json.ot) obs.push(json.ot[i]);
				obs.sort(radlibs_compare_ix);

				for( var i in obs ) {

					var ix = radlibs_attr(obs[i],'ix',notspec);
					var susp = radlibs_attr(obs[i],'sr',notspec) + ' suspicion for recurrence';
					var segs = lirads_get_segments(obs[i]);
					var seriesimage = lirads_get_series_image(obs[i]);

					var lr = RLHP(obs[i],'lr') ? ('Pretreatment ' + obs[i].lr) : '';
					var enh = (RLHP(obs[i],'d1') || RLHP(obs[i],'d2')) ? ('Size of residual arterial enhancement: ' + radlibs_join('x',[obs[i].d1,obs[i].d2],'') + ' mm') : '';
					var cav = (RLHP(obs[i],'c1') || RLHP(obs[i],'c2')) ? ('Size of treatment cavity: ' + radlibs_join('x',[obs[i].c1,obs[i].c2],'') + ' mm') : '';
					var comments = radlibs_attr(obs[i],'co','');

					rval += 'Observation ' + radlibs_join('\n',[radlibs_join(', ',[ix,susp,segs,seriesimage,lr,comments],''),enh,cav]) + '\n\n';

				}
			}

			if( rval === '' ) {
				return 'Treated observations: None\n';
			} else {
				return 'Treated observations:\n\n' + rval;
			}
		} // findings
	};

	var resolved_section = {label:'Resolved Observation', prefix:'or', short_label:'Obs', serial:radlibs_range(1,10),
		fields:[
			{label:'Index',           code:'ix', type:'int', size:3},
			{label:'Resolution Date', code:'rd', type:'us-date', w2field_type:'date', size:10 },
			{label:'Comments',               code:'co', type:'text', size:30, rotate:'0deg'},
		],
		findings:function(json) {
			var rval = '';
			if( RLHP(json,'or') ) {
				var obs = [];
				for( var i in json.or) obs.push(json.or[i]);
				obs.sort(radlibs_compare_ix);

				for( var i in obs ) {
					var index = radlibs_attr(obs[i],'ix',notspec);
					//var segments = RLHP(obs[i],'se') ? ('Segments ' + radlibs_conjoin(', ',obs[i].se,notspec, global_radlibs_and) + '') : '';
					var reson = RLHP(obs[i],'rd') ? ('resolved on ' + obs[i].rd) : '';
					var other = radlibs_attr(obs[i],'ot','');
					rval += 'Observation ' + radlibs_join(', ',[index,reson,other],'') + '\n';
				}
			}

			if( rval === '' ) {
				return 'Resolved observations: None\n\n';
			} else {
				return '\nResolved observations:\n' + rval + '\n';
			}
		} // findings
	};

	// ---------- LYMPH NODES ----------

	var lymph_node_locs   = ['Porta hepatis','Left paraortic','Right paraortic'];

	var lymph_node_section = {label:'Lymph nodes', prefix:'ln', short_label:'Node', serial:radlibs_range(1,3), hide:true, fields:[
		{label:'Location',        code:'lo', type:'combo', items: lymph_node_locs, size:20, rotate:"0deg"},
		{label:'Series number',   code:'sn', type:'int',   size:3 },
		{label:'Image number',    code:'in', type:'int',   size:3 },
		{label:'Long axis (cm)',  code:'d1', type:'float', size:3 },
		{label:'Short axis (cm)', code:'d2', type:'float', size:3 },
	]};

  // ---------- SECTIONS ----------

	return {name:name, version:version, sections:[
		exam_section,
		liver_section,
		hepatic_vasculature_section,
		untreated_section,
		treated_section,
		resolved_section,
		spleen_section,
		lymph_node_section,
	]};

} // lirads_init

*/

/*




	/*
	if( radlibs_has_path(json,'sp.si') ) json.sp.si_helper = (parseInt(json.sp.si) >= lirads_splenomegaly_threshold) ? ', enlarged.' : ', unenlarged.';
	var template = 'SPLEEN: {{^sp}}Unremarkable{{/sp}}{{sp.si}}{{#sp.si}} cm{{/sp.si}}{{sp.si_helper}} {{sp.co}}';
	return Mustache.to_html(template,json);

	var rval = '';

	if( RLHP(json,'ou') ) {
		var obs = [];
		for( var i in json.ou ) obs.push(json.ou[i]);
		obs.sort(radlibs_compare_ix);

		for( var i in untreated_section_serial ) {
			var su = RLHP(json.ou,i) ? lirads_get_suggested_category(json.ou[i]) : '';
			$( radlibs_id_serial_field('ou',i,'su')).val(su);
		} // i

		var feature_labels = {
			'ah':'arterial hyperenhancement',
			'wa':'washout',
			'ca':'capsule',
			'tv':'tumor in vein'};

		for( var i in obs ) {
			var index = radlibs_attr(obs[i],'ix',notspec);
			var lrcat = radlibs_attr(obs[i],'lr','LR ' + notspec);
			var segments = lirads_get_segments(obs[i]);// 'Segment' + ((RLHP(obs[i],'se') && obs[i].se.length == 1) ? (' ' + obs[i].se[0]) : ('s ' + radlibs_conjxn(obs[i].se, notspec)));
			var seriesimage = lirads_get_series_image(obs[i]);
			var size = (RLHP(obs[i],'d1') || RLHP(obs[i],'d2')) ? ('Size ' + radlibs_join('x',[obs[i].d1,obs[i].d2],'') + ' mm') : '';
			var growth = RLHP(obs[i],'gr') ? obs[i].gr : notspec;
			var comments = radlibs_attr(obs[i],'co','');

			rval += 'Observation ' + radlibs_join(', ',[index,segments,seriesimage,size,lrcat,comments],'') + '\n';

			var pos_features = [];
			var neg_features = [];
			var new_features = [];

			for( var j in feature_labels ) {
				var jtv = j === 'tv';
				if( RLHP(obs[i],j) ) {
					if( obs[i][j] === 'Yes' ) {
						pos_features.push( feature_labels[j] );
					} else if( obs[i][j] === 'New' ) {
						pos_features.push( feature_labels[j] );
						new_features.push( 'new ' + feature_labels[j] );
					} else if( obs[i][j] === 'No' ) {
						neg_features.push( 'no ' + feature_labels[j] );
					}
				}
			}

			var anc_features = RLHP(obs[i],'af') ? ('. Also has ' + radlibs_conjxn( obs[i].af, '' ).toLowerCase()) : '';

			rval += 'Observation features: ' + radlibs_capitalize( radlibs_conjxn( radlibs_concat([pos_features,neg_features]), notspec)) + anc_features + '.\n';
			rval += 'Observation feature stability: ' + radlibs_capitalize(radlibs_conjxn( new_features, notspec)) + '\n';
			rval += 'Observation size stability: ' + radlibs_capitalize(growth) + '\n\n';

			*/
