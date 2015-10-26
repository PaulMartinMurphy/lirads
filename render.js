//
// (c) 2015 Paul Murphy
//

Mustache.escape = function (value) {
    return value;
};

function radlibs_compare(a,b) {
	if( a === b ) {
		return 'eq';
	} else if( a > b ) {
		return 'gt';
	} else {
		return 'lt';
	}
} // radlibs_compare

function lirads_get_max_size(sizexsize) {
	return Math.max.apply(null,radlibs_apply(sizexsize.split('x'),parseInt));
} // lirads_max_size

function lirads_get_suggested_category_helper(sz,gr,ah,wa,ca,tv,nm) {

	nm = nm === 'Yes' || nm === 'New'; // non-hcc malignancy
	tv = tv === 'Yes' || tv === 'New'; // tumor in vein

	if( nm ) return 'LR-M';
	if( tv ) return 'LR-5V';

	var d = lirads_get_max_size( sz );

	ah = ah === 'Yes' || ah === 'New'; // arterial hyperenhancement
	wa = wa === 'Yes' || wa === 'New'; // washout
	ca = ca === 'Yes' || ca === 'New'; // capsule appearance
	gr = gr === 'Threshold'; // threshold growth

	var sum = wa + ca + gr;
	if( !ah ) {
		if( d < 20 ) {
			switch(sum) {
				default:
				case 0: return 'LR-3';
				case 1: return 'LR-3';
				case 2: return 'LR-4';
			}
		} else { // d >= 20 }
			switch(sum) {
				default:
				case 0: return 'LR-3';
				case 1: return 'LR-4';
				case 2: return 'LR-4';
			}
		}
	} else { // ah
		if( d < 10 ) {
			switch(sum) {
				default:
				case 0: return 'LR-3';
				case 1: return 'LR-4';
				case 2: return 'LR-4';
			}
		} else if( 10 <= d && d < 20 ) {
			switch(sum) {
				default:
				case 0: return 'LR-3';
				case 1: return 'LR-4/5';
				case 2: return 'LR-5';
			}
		} else { // d >= 20 }
			switch(sum) {
				default:
				case 0: return 'LR-4';
				case 1: return 'LR-5';
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
		sg = "Stable size";
	} else if( d1 < d0 ) {
		sg = "Smaller size";
	} else if( (d0 === 0 && d1 >= 10) ||
	 					 (d0 !== 0 && ratio >= 1.5 && dt <= SIX_MONTHS) ||
						 (d0 !== 0 && ratio >= 2.0 && dt > SIX_MONTHS) ) {
		sg = "Threshold growth";
	} else {
		sg = "Subthreshold growth";
	}

	$(index).val( sg );

} // lirads_get_suggested_growth

function lirads_set_suggested_tstage(json) {
	var index = "#im-st";

	if( !RLHP(json,'ou') ) {
		$(index).val('');
		return;
	}

	var lr5 = 0;
	var lr5v = 0;
	var lr5_10_20 = 0;
	var lr5_10_30 = 0;
	var lr5_20_50 = 0;
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
			if( 20 <= d && d < 50 ) lr5_20_50++;
			if( 10 <= d ) lr5_gt10++;
			if( 30 <= d ) lr5_gt30++;
			if( 50 <= d ) lr5_gt50++;
		}
	} // i

	var st = 'Not applicable';

	if( lr5v > 0 ) {
		// T4b - The presence of tumor in vein (LR5V) denotes radiologic T-stage 4b, regardless of the size or number of individual observations
		st = "T4b";
	} else if( lr5_gt10 >= 4 ) {
		// T4: At least four >10mm LR5 observations.
		st = "T4a";
	} else if ( lr5_gt50 === 1 || ((lr5 === 2 || lr5 === 3) && lr5_gt30 >= 1 ) ) {
		// T3: One >50mm LR5 observation OR two to three LR5 observations at least one of which is > 30mm.
		st = "T3";
	} else if( lr5_20_50 === 1 || (lr5_10_30 === 2 || lr5_10_30 === 3) ) {
		// T2: One 20-50mm LR5 observation OR two to three 10-29mm LR5 observations.
		st = "T2";
	} else if( lr5_10_20 === 1 ) {
		// T1: One 10-19mm LR5 observation.
		st = "T1";
	}

	// Set value of im-st
	$(index).val(st);

} // lirads_set_selected_tstage

function lirads_segments_helper(obs) {
	obs['se_helper'] = "Segment" + radlibs_pluralize(obs['se']) + ': ' + radlibs_conjunction( obs['se'], 'not specified' );
} // lirads_segments_helper

function lirads_seriesimage_helper(obs,bcap) {

	var snum = "not specified";
	var inum = "not specified";

	if( RLHP(obs,'sn') ) {
		var s = obs.sn.split(':');
		switch( s.length ) {
			case 1: snum = s[0]; break;
			case 2: snum = s[0]; inum = s[1]; break;
		}
	}

	if( bcap ) {
		obs['sn_helper'] = "Series: " + snum + ", Image number: " + inum;
	} else {
		obs['sn_helper'] = "series: " + snum + ", image number: " + inum;
	}

} // lirads_seriesimage_helper

function lirads_untreated_helper(obs) {

	var feature_labels = {
		'ah':'arterial phase hyperenhancement',
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

	if( (pos_features.length + neg_features.length) > 0 ) {
		obs['mf_helper'] = radlibs_conjunction( pos_features.concat(neg_features), 'not specified' );
	}
	if( new_features.length > 0 ) {
		obs['nf_helper'] = radlibs_conjunction( new_features, 'not specified' );
	}
	if( RLHP(obs,'af') ) {
		obs['af_helper'] = radlibs_conjunction( radlibs_uncapitalize(obs['af']) );
	}

} // lirads_features_helper

function lirads_aggregate_helper(obs) {

	if( RLHP(obs,'se')) obs['se_helper'] = "segment" + radlibs_pluralize(obs.se) + ' ' + radlibs_conjunction(obs.se);
	if( RLHP(obs,'lo')) obs['lo_helper'] = radlibs_uncapitalize(obs.lo);
	if( RLHP(obs,'mf')) obs['mf_helper'] = radlibs_conjunction( radlibs_uncapitalize(obs.mf) );
	if( RLHP(obs,'af')) obs['af_helper'] = radlibs_conjunction( radlibs_uncapitalize(obs.af) );

} // lirads_aggregate_features_helper

function lirads_festhu_helper(json) {

	var LIRADS_MR_PDFF_THRESHOLD     = 4;
	var LIRADS_CT_HU_THRESHOLD       = 40;
	var LIRADS_3_0T_R2STAR_THRESHOLD = 90;
	var LIRADS_1_5T_R2STAR_THRESHOLD = 60;

	if( radlibs_has_path(json,'li.st') && radlibs_get_path(json,'te.mo','') === "MR") {
		json['li']['st_helper'] = {
			'lt':"No hepatic steatosis", 'eq':"Borderline hepatic steatosis", 'gt':"Hepatic steatosis" }[radlibs_compare(parseInt(json.li.st),LIRADS_MR_PDFF_THRESHOLD) ] +
			", PDFF " + json.li.st + "%. ";
	}

	if( radlibs_has_path(json,'li.hu') && radlibs_get_path(json,'te.mo','') === "CT") {
		json['li']['hu_helper'] =
			{'lt':"No hepatic steatosis", 'eq':"Borderline hepatic steatosis", 'gt':"Hepatic steatosis" }[radlibs_compare(parseInt(json.li.hu),LIRADS_CT_HU_THRESHOLD) ] +
		 	", liver measures " + json.li.hu + " HU. ";
	}

	if( radlibs_has_path(json,'li.fe') && radlibs_get_path(json,'te.mo','') === "MR") {
		var fe_threshold = (radlibs_get_path(json,'te.fs','3.0') === '3.0') ? 90 : 60;
		json['li']['fe_helper'] =
			{'lt':"No iron overload", 'eq':"Borderline iron overload", 'gt':"Iron overload" }[radlibs_compare(parseInt(json.li.fe),fe_threshold) ] +
		 	", R2* " + json.li.fe + " 1/s. ";
	}

} // lirads_festhu_helper

function lirads_compare_index(a,b) {
 var ia = parseInt(radlibs_get_path(a,'ix','0'));
 var ib = parseInt(radlibs_get_path(b,'ix','0'));
 return ia - ib;
} // radlibs_compare_ix

function radlibs_render(json, update_form) {

	var rval = '';
	var template;

	// TECHNIQUE SECTION

	var temo = radlibs_get_path(json,'te.mo','');
	if( temo === "CT" ) {
		template =
			"TECHNIQUE:\n" +
			"COVERAGE: Abdomen\n" +
			"IV CONTRAST: {{# te.vc }}{{ te.vc }} mL {{/ te.vc}}{{ te.cn}}{{^ te.cn }}Omnipaque{{/ te.cn}}{{ #te.rc }} at {{ te.rc }} mL/sec{{/te.rc}}\n" +
			"PHASES ACQUIRED: Noncontrast, arterial, portal venous, delayed\n" +
			"ORAL CONTRAST GIVEN: No\n" +
			"ADVERSE EVENTS: None\n" +
			"RECONSTRUCTIONS: Axial 3.75 mm and sagittal/coronal 3 mm\n" +
			"{{# te.co }}COMMENTS: {{te.co }}\n{{/te.co}}" +
			"\n\n";
		rval += Mustache.to_html(template,json);
	} else if( temo === "MR" ) {
		template =
			"TECHNIQUE:\n" +
			"SCANNER: {{# te.fs }}{{ te.fs }} Tesla {{/ te.fs }}superconducting magnet\n" +
			"COVERAGE: Abdomen\n" +
			"IV CONTRAST: {{# te.vc }}{{ te.vc }} mL {{/ te.vc}}{{ te.cn}}{{^ te.cn }}Gadavist{{/ te.cn}}\n" +
			"{{ #te.rc }}RATE: {{ te.rc }} mL/sec\n{{/te.rc}}" +
			"SEQUENCES: Multiplanar, multisequence MR images were acquired prior to and following contrast administration.\n" +
			"{{# te.co }}COMMENTS: {{te.co }}\n{{/te.co}}" +
			"\n\n";
		rval += Mustache.to_html(template,json);
  }

	// FINDINGS SECTION

	if( radlibs_has_path(json,'li.ci') && json.li.ci === "Yes") json['li']['ci_helper'] = " consistent with cirrhosis";

	lirads_festhu_helper(json);

	if( radlibs_has_path(json,'hv.va') ) json['hv']['va_helper'] = radlibs_conjunction( radlibs_uncapitalize(json.hv.va) ) + ". ";
	if( radlibs_has_path(json,'hv.sr') && json.hv.sr === "Yes" ) json['hv']['sr_helper'] = "Splenorenal shunt. ";
	if( radlibs_has_path(json,'hv.rp') && json.hv.rp === "Yes" ) json['hv']['rp_helper'] = "Recanalized periumbilical vein. ";
	if( radlibs_has_path(json,'hv.ti') ) json['hv']['ti_helper'] = "TIPS " + radlibs_uncapitalize(json.hv.ti) + ". ";

	// BILIARY
	if( radlibs_has_path(json,'bi.gb') ) json['bi']['gb_helper'] = json.bi.gb.join('. ') + '. ';
	if( radlibs_has_path(json,'bi.bd') ) json['bi']['bd_helper'] = json.bi.bd.join('. ') + '. ';

	template =
		"FINDINGS:\n" +
		"LIVER:\n" +
		"Morphology: {{ #li.mo }}{{li.mo}}{{ li.ci_helper }}. {{/li.mo}}{{^li.mo}}No surface nodularity. {{/li.mo}}\n" +
		'Hepatic arterial anatomy: {{hv.ha}}{{^hv.ha}}Standard. {{/hv.ha}}\n' +
		'Portal and hepatic veins: {{ #hv.pv }}{{ hv.pv }}. {{ /hv.pv }}{{ #hv.hv }}{{ hv.hv }}. {{/hv.hv }}{{^hv.pv}}{{^hv.hv}}Patent. {{/hv.hv}}{{/hv.pv}}{{ hv.ti_helper }}\n' +
		'{{# hv.md }}Main portal vein diameter: {{hv.md}} mm\n{{/ hv.md}}' +
		'Varices: {{hv.va_helper}}{{^hv.va}}None. {{/hv.va}}{{hv.sr_helper}}{{ hv.rp_helper }}\n' +
		'Ascites: {{li.as}}{{^li.as}}None. {{/li.as}}\n' +
		"Biliary: {{ bi.gb_helper }}{{ bi.bd_helper }}{{ # bi.cb }}Common bile duct measures {{ bi.cb }} mm. {{/bi.cb}}{{ bi.co }}{{^ bi }}Unremarkable. {{/ bi }}\n" +
		"Comments: {{# li.co }}{{ li.co }}. {{/li.co}}{{#hv.co}}{{ hv.co }}. {{/hv.co}}{{ li.st_helper }}{{ li.hu_helper }}{{ li.fe_helper }}{{^ li.co }}{{^ hv.co }}{{^ li.st_helper }}{{^ li.fe_helper }}None. {{/li.fe_helper}}{{ /li.st_helper}}{{ /hv.co }}{{ /li.co }}\n" +
		'\n';
	rval += Mustache.to_html(template,json);

	// UNTREATED

	if( RLHP(json,'ou') ) {
		rval += 'Untreated observations:\n';

		template = // !!! change series and image back to Series, Image number
			"Observation {{ ix }}{{^ix}}not specified{{/ix}}, {{ se_helper }}, {{sn_helper}}, Size: {{#sz}}{{ sz }} mm{{/sz}}{{^sz}}not specified{{/sz}}, {{ lr }}{{^lr}}LR not specified{{/lr}}{{#co}}, {{ co }}{{/co}}" +
			"{{# mf_helper }}\nObservation features: {{ mf_helper }}{{ #af_helper }}. Also has {{ af_helper }}.{{/ af_helper}}{{/mf_helper}}{{^ mf_helper }}{{# af_helper }}\nObservation features: {{ af_helper}} {{/af_helper}} {{/mf_helper}}" +
			"{{# nf_helper }}\nObservation feature stability: {{ nf_helper }}{{/nf_helper}}" +
			"{{# gr }}\nObservation size stability: {{ gr_helper }}{{/gr}}" +
			"\n\n";

		for( var i in json['ou'] ) {
			var obs = json['ou'][i];
			lirads_segments_helper(obs);
			lirads_untreated_helper(obs);
			lirads_seriesimage_helper(obs,true);

			if( RLHP(obs,'gr') ) obs['gr_helper'] = radlibs_uncapitalize( obs.gr );

			if( update_form ) {
				lirads_set_suggested_category(obs,i);
				lirads_set_suggested_growth(json,obs,i);
			}

			rval +=  Mustache.to_html( template, obs );
		} // i
	} else {
		rval += 'Untreated observations: None.\n';
	}// ou

	if( RLHP(json,'ot') ) {
		rval += 'Treated observations:\n';

		template =
			"Observation {{ ix }}{{^ix}}not specified{{/ix}}, {{ se_helper }}, {{sn_helper}}, Pre-treatment: {{ lr }}{{^lr}}LR not specified{{/lr}}, Suspicion for recurrence: {{ sr }}{{^sr}}not specified{{/sr}}{{#co}}, {{ co }}{{/co}}" +
			"{{# sz }}\nResidual arterial phase hyperenhancement: {{ sz }} mm{{ #ps }}, {{ ps }}% of initial.{{/ ps }}{{/sz}}" +
			"{{# cs }}\nTreatment cavity: {{ cs }} mm{{/cs}}" +
			"\n\n";

		for( var i in json['ot'] ) {
			var obs = json['ot'][i];
			lirads_segments_helper(obs);
			lirads_seriesimage_helper(obs,true);
			rval +=  Mustache.to_html( template, obs );
		}
	} else {
		rval += 'Treated observations: None.\n';
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
	} else {
		rval += 'Resolved observations: None.\n';
	} // ot

	if( RLHP(json,'oa')) {
		var obs = json['oa'];
		lirads_aggregate_helper(obs);
		template = "Aggregate observation: There are multiple similar observations{{# lo_helper }}, involving the {{ lo_helper }}{{/lo_helper}}{{# se_helper }}, in {{ se_helper }}{{/ se_helper }}{{# sz }}, measuring up to {{ sz }} mm{{/sz}}{{ #ps }}, measured up to {{ ps }} mm on prior{{/ps}}{{#mf_helper}}, with {{ mf_helper }}{{/mf_helper }}{{# af_helper }}{{#mf_helper}}, as well as {{/mf_helper}}{{^mf_helper}}, with {{/mf_helper}}{{af_helper}}{{/ af_helper }}, with aggregate LI-RADS category {{lr}}{{^lr}}not specified{{/lr}}. {{# co }}{{ co }}. {{/ co }}\n\n"
		rval += Mustache.to_html(template, obs);
	}

	rval += '\n';

	var LIRADS_SPLENOMEGALY_THRESHOLD = 12; // cm
	if( radlibs_has_path(json,'sp.sz') ) {
		json.sp['sz_helper'] = { 'lt':'unenlarged', 'eq':'borderline enlarged', 'gt':'enlarged' }[ radlibs_compare(parseInt(json.sp.sz),LIRADS_SPLENOMEGALY_THRESHOLD)];
	}
	template = "SPLEEN:{{# sp.sz }} {{ sp.sz }} cm, {{ sp.sz_helper }}.{{/ sp.sz }}{{# sp.co }} {{ sp.co }}{{/ sp.co }}{{^ sp.sz }}{{^ sp.co }} Unremarkable.{{/ sp.co }}{{/sp.sz}}\n";
	rval += Mustache.to_html(template,json);

	rval += 'LYMPHATIC: ';
	if( RLHP(json,'ln') ) {
		for( var i in json['ln'] ) {
			lirads_seriesimage_helper(json['ln'][i],false);
			template = "{{# lo }}{{ lo }} {{/lo}}{{^lo}}Lymph {{/lo}}node{{# sn }} ({{sn_helper}}){{/sn}}{{# sz }}, measures {{ sz }} mm{{/sz}}{{ #ps }}, measured {{ ps }} mm on prior{{/ps}}{{# co }}, {{co}}{{/co}}.";
			rval +=  Mustache.to_html( template, json['ln'][i] );
		}
	} else {
		rval += "Unremarkable.";
	}
	rval += "\n\n";

	rval += "IMPRESSION:\n";
	var n = 0;

	// Summary
	//if( radlibs_has_path(json,'im.su')) {
	//	rval += '' + (++n) + '. ' + json.im.su + '\n\n';
	//}

	// LI-RADS
	rval += '' + (++n) + '. ';
	if( RLHP(json,'oa') || RLHP(json,'ou') || RLHP(json,'ot') ) {
		rval += "LI-RADS Observations:\n";

		var obs = [];

		template =  "Aggregate observation, {{ lr }}{{^lr}}LR not specified{{/lr}}\n";
		if( RLHP(json,'oa') ) {
			var ix = '99';
			obs.push( {ix:ix, line:Mustache.to_html(template, json.oa) } );
		}

		if( RLHP(json,'ou') )	{
			template =  "Observation {{ ix }}{{^ix}}not specified{{/ix}}, {{ lr }}{{^lr}}LR not specified{{/lr}}\n";
			for( var i in json['ou'] ) {
				var ix = radlibs_get_path(json['ou'][i],'ix','0');
				obs.push( {ix:ix, line:Mustache.to_html(template, json['ou'][i]) } );
			}
			//rval += Mustache.to_html(template, json['ou'][i]);
		}

		if( RLHP(json,'ot') ) {
			template =  "Observation {{ ix }}{{^ix}}not specified{{/ix}}, {{#sr}}{{ sr }} suspicion for recurrence{{/sr}}{{^sr}}Suspicion for recurrence not specified{{/sr}}\n";
			for( var i in json['ot'] ) {
				var ix = radlibs_get_path(json['ot'][i],'ix','0');
				obs.push( {ix:ix, line:Mustache.to_html(template, json['ot'][i]) } );
			}
		}

		obs.sort(lirads_compare_index);
		for( var i in obs ) {
			rval += obs[i].line;
		} // i

	} else {
		rval += "No reportable LI-RADS observations.\n";
	}
	rval += "\n";

	if( update_form ) {
		lirads_set_suggested_tstage(json);
	}

	if( radlibs_has_path(json,'im.ts') ) {
		rval += '' + (++n) + '. Radiologic tumor stage: ' + json.im.ts + '\n\n';
	}

	if( radlibs_has_path(json,'im.re') ) {
		rval += '' + (++n) + '. Radiologic recommendation: ' + json.im.re + '\n\n';
	}

	// Cirrhosis & portal hypertension
	var cirr = radlibs_has_path(json,'li.ci') && json.li.ci === "Yes";
	var phtn = [];
	if( radlibs_has_path(json,'li.as') && json.li.as !== "None") phtn.push( radlibs_uncapitalize(json.li.as) + ' ascites');
	if( radlibs_has_path(json,'hv.va') && json.hv.va.length > 0 ) phtn.push( radlibs_conjunction(radlibs_uncapitalize(json.hv.va),"") + ' varices');
	if( radlibs_has_path(json,'hv.sr') && json.hv.sr === "Yes") phtn.push('splenorenal shunt');
	if( radlibs_has_path(json,'hv.rp') && json.hv.rp === "Yes") phtn.push('recanalized periumbilical vein');
	if( parseInt(radlibs_get_path(json,'sp.sz','0')) > LIRADS_SPLENOMEGALY_THRESHOLD ) phtn.push( 'splenomegaly' );

	if( cirr || phtn.length !== 0 ) {
		rval += '' + (++n) + '. ';
		if( cirr && phtn.length === 0) {
			rval += 'Cirrhosis without sequela of portal hypertension.';
		} else if( cirr && phtn.length !== 0) {
			rval += 'Cirrhosis with sequela of portal hypertension including ' + radlibs_conjunction(phtn) + '.';
		} else if( !cirr & phtn.length !== 0 ) {
			rval += radlibs_capitalize(phtn).join('. '); // Don't invoke portal hypertension
		}
		rval += '\n\n';
	}

	// Additional impressions
	if( radlibs_has_path(json,'im.ad')) {
		var imads = json.im.ad.split('\n');
		for( var i in imads ) {
			rval += '' + (++n) + '. ' + imads[i] + '\n\n';
		}
	}

	return rval;

} // radlibs_render
