var build = "3";
var selectedServer, lobj, compclk;
var servers = null;

var UCFirst = function(string) { return string.charAt(0).toUpperCase() + string.slice(1); };
var round = function(fval,dec) { return dec > 0 ? (Math.round(fval * 10 * dec) / (10 * dec)) : Math.round(fval); };
var getHtmlTag = function(val,care,warn,crit) { return {tag: (val > crit ? 'critical' : (val > warn ? 'warning' : (val > care ? 'careful' : 'span'))), level: (val > crit ? 3 : (val > warn ? 2 : (val > care ? 1 : 0))) }; };
var bytesToSize = function(bytes, dec) { var sizes = ['Bytes', 'K', 'M', 'G', 'T']; if (bytes == 0) return '0'; var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024))); return round(bytes / Math.pow(1024, i), dec) + sizes[i]; };
var bitsToSize = function(bits, dec) { var sizes = ['b', 'Kb', 'Mb', 'Gb', 'Tb']; if (bits == 0) return '0'; var i = parseInt(Math.floor(Math.log(bits) / Math.log(1000))); return round(bits / Math.pow(1000, i), dec) + sizes[i]; };
var displayPopup = function(selector, message) { $('#'+selector+' > p#msg').html(message); $('#'+selector).popup("open"); };

$.ajaxSetup({ cache: false });

// Splash
function hideSplash() { $.mobile.changePage("#home", "fade"); }
$('#splash').bind('pageshow',function(event){
	setTimeout(hideSplash, 2000);
});

// Home
$('#home').bind('pageshow',function(event){
	selectedServer = null;
	lobj = null;
	// Load Storage datas
	try {
		// Build change
		if(typeof(localStorage.build)==="undefined" || localStorage.build < build){
			localStorage.build = build;
		}
		// Retrieve localStorage.servers
		if(typeof(localStorage.servers)==="undefined"){
			localStorage.servers = JSON.stringify([]);
		}
		if(typeof(localStorage.config)!=="undefined") {
			var user = JSON.parse(localStorage.config);
			$('#user').show().html('Logged as : <b>'+user.mail+'</b>');
		}
		else {
			$('#user').hide();
		}
		servers = JSON.parse(localStorage.servers);
		if(servers.length){
			$('ul#serverList').empty().append('<li data-role="list-divider" role="heading">Server List</li>');
			$.each(servers, function(i,item){
				$('ul#serverList').append('<li><a href="#serverdetails" id="srv-'+i+'">'+item.desc+'</a></li>');
			});
			$('ul#serverList > li > a').bind('click', function(event, ui) {
				selectedServer = $(this).attr('id').split('-')[1];
			});
			$('ul#serverList').listview('refresh');
		}
		else {
			$('ul#serverList').empty().append('<li data-role="list-divider" role="heading">Server List</li><li>- empty -</li>');
			$('ul#serverList').listview('refresh');
		}
	} catch(err) {
		displayPopup('popupNotSupported', 'Sorry! No web storage support...');
	}
});

// ServerDetails
$('#serverdetails').bind('pagebeforeshow',function(event, page){
	if(!servers || !selectedServer) {
		$.mobile.changePage($("#home"));
	}
	else {
		var srv = servers[selectedServer];
		$('#serverName').html(srv.desc);
		if(page.prevPage.attr('id') == "home") {
			$('#serverData').html('<div style="text-align: center;"><img src="images/ajax-loader.gif" style="margin-top:50px" /><p>Loading data ...</p></div>');
		}
	}
});
$('#serverdetails').bind('pageshow',function(event, page){
	if(!servers || !selectedServer) {
		$.mobile.changePage($("#home"));
	}
	else {
		var srv = servers[selectedServer];
		if(page.prevPage.attr('id') == "home") {
			var cacheVar = new Date().getTime();
			$.ajax({
				url: 'serverRequest.php?'+cacheVar,
				data: 'fqdn='+srv.fqdn+'&ipv4='+srv.ipv4+'&port='+srv.port,
				type: 'post',
				contentType: "application/x-www-form-urlencoded",
				success : function(response, status, jqXHR) {
					console.log(JSON.parse(response));
					$('#serverData').html('');
					var obj = JSON.parse(response);
					lobj = obj;
					loadLinuxTemplate(lobj);
				},
				error : function (xhr, ajaxOptions, thrownError){
					$('#serverData').html('');
					displayPopup('popupDetails', 'Server not responding !');
				} 
			});
		}
	}
});
$('#serverDelete').bind('click', function(event, ui) {
	if(selectedServer) {
		servers.splice(selectedServer,1);
		localStorage.servers = JSON.stringify(servers);
	}
	$.mobile.changePage($("#home"));
});

// ComponentDetails
$('#componentdetails').bind('pagebeforeshow',function(event, page){
	if(!lobj || typeof(compclk) === "undefined") {
		$.mobile.changePage($("#home"));
	}
	else {
		$('#componentdetails').find('h3').html(UCFirst(compclk));
		var ecd = $('#componentData');
		ecd.html('');
		window['loadLinux'+UCFirst(compclk)+'Template'](ecd);
	}
});

// ServerForm
$('#serverform').bind('pagebeforeshow',function(event){
	if(!servers) {
		$.mobile.changePage($("#home"));
	}
	// Reinit input values
	$('input[name="fqdn"]').val('');
	$('input[name="ipv4"]').val('');
	$('input[name="desc"]').val('');
});
$('#formSave').bind('click', function(event, ui) {
	// Validation patterns
	var fqdnPattern = /(?=^.{1,254}$)(^(?:(?!\d+\.)[a-zA-Z0-9_\-]{1,63}\.?)+(?:[a-zA-Z]{2,})$)/;
	var ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}?(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
	var portPattern = /^[0-9]{2,5}$/;
	// Retrieve input values
	var fqdn_val = $('input[name="fqdn"]').val();
	var ipv4_val = $('input[name="ipv4"]').val();
	var port_val = $('input[name="port"]').val();
	var desc_val = $('input[name="desc"]').val();
	if(desc_val == '') desc_val = (fqdn_val == '' ? ipv4_val : fqdn_val);
	// Test values with patterns
	if((fqdnPattern.test(fqdn_val) || ipv4Pattern.test(ipv4_val)) && portPattern.test(port_val)){
		// Check if server not already in collection
		var alreadyExists = false;
		$.each(servers, function(i,item){
			if(item.fqdn != "" && item.fqdn == fqdn_val) alreadyExists = true;
			if(item.ipv4 != "" && item.ipv4 == ipv4_val) alreadyExists = true;
		});
		// Store the new server
		if(!alreadyExists){
			servers.push({fqdn:fqdn_val,ipv4:ipv4_val,port:port_val,desc:desc_val});
			servers.sort(function(a,b) {return (a.desc > b.desc) ? 1 : ((b.desc > a.desc) ? -1 : 0);});
			localStorage.servers = JSON.stringify(servers);
			// Go back to main view
			$.mobile.changePage($("#home"), { transition: "flip"} );
		}
		else {
			displayPopup('popupForm', 'Server already exists');
		}
	}
	else {
		displayPopup('popupForm', 'Invalid format !');
	}
});

// Cloud
$('#cloud').bind('pagebeforeshow',function(event){
	$('#fldMail').val('');
	$('#fldPass').val('');
	if(typeof(localStorage.config)==="undefined") {
		$('#signout').hide();
		$('#guest').show();
		$('#registered').hide();
	}
	else {
		$('#signout').show();
		$('#guest').hide();
		$('#registered').show();
	}
});
$('#btnRegister').click(function(){
	localStorage.config = JSON.stringify({mail:$('#fldMail').val(),pass:$('#fldPass').val()});
	$('#signout').toggle();
	$('#guest').toggle();
	$('#registered').toggle();
});
$('#signout').click(function(){
	localStorage.removeItem("config");
	$('#signout').toggle();
	$('#guest').toggle();
	$('#registered').toggle();
	$('#fldMail').val('');
	$('#fldPass').val('');
});
$('#btnRestore').click(function(){
	var user = JSON.parse(localStorage.config);
	var cacheVar = new Date().getTime();
	$.ajax({
		url: 'config.php?'+cacheVar,
		data: 'mail='+user.mail+'&pass='+user.pass,
		type: 'post',
		contentType: "application/x-www-form-urlencoded",
		success : function(response, status, jqXHR) {
			localStorage.servers = response;
			servers = JSON.parse(localStorage.servers);
			displayPopup('popupCloud', 'Restore completed ...');
		},
		error : function (xhr, ajaxOptions, thrownError){
			displayPopup('popupCloud', 'Restoration failed !');
		} 
	});
});
$('#btnStore').click(function(){
	var user = JSON.parse(localStorage.config);
	var cacheVar = new Date().getTime();
	$.ajax({
		url: 'config.php?'+cacheVar,
		data: 'mail='+user.mail+'&pass='+user.pass+'&conf='+localStorage.servers,
		type: 'post',
		contentType: "application/x-www-form-urlencoded",
		success : function(response, status, jqXHR) {
			displayPopup('popupCloud', 'Backup completed ...');
		},
		error : function (xhr, ajaxOptions, thrownError){
			displayPopup('popupCloud', 'Backup failed !');
		} 
	});
});

// Data display template
var loadLinuxTemplate = function(obj) {
	var esd = $('#serverData');
	var content = '';
	
	// Information
	content = '';
	$.each(obj.host, function(i,item){
		var title = UCFirst(i.replace('_',' '));
		content += '<li>'+title+' <p class="ui-li-aside">'+item+'</p></li>';
	});
	esd.append('<div data-role="collapsible" id="diskio"><h3>Informations</h3><ul data-role="listview" data-inset="true">'+content+'</ul></div>');

	// Usage
	content = '';
	// Cpu
	htmlTag = getHtmlTag(100 - obj.cpu.idle,50,70,90);
	highTag = htmlTag;
	content += '<li><a href="#componentdetails" onClick="compclk=\'cpu\'"><'+htmlTag.tag+'>CPU <p class="ui-li-aside">'+round(100 - obj.cpu.idle,1)+'%</p></'+htmlTag.tag+'></a></li>';
	// Ram
	htmlTag = getHtmlTag(obj.mem.percent,50,70,90);
	highTag = htmlTag.level > highTag.level ? htmlTag : highTag;
	content += '<li><a href="#componentdetails" onClick="compclk=\'ram\'"><'+htmlTag.tag+'>RAM <p class="ui-li-aside">'+obj.mem.percent+'%</p></'+htmlTag.tag+'></a></li>';
	// Swap
	htmlTag = getHtmlTag(obj.memswap.percent,50,70,90);
	highTag = htmlTag.level > highTag.level ? htmlTag : highTag;
	content += '<li><a href="#componentdetails" onClick="compclk=\'swap\'"><'+htmlTag.tag+'>SWAP <p class="ui-li-aside">'+obj.memswap.percent+'%</p></'+htmlTag.tag+'></a></li>';
	esd.append('<p>Usage</p><ul data-role="listview" data-inset="true">'+content+'</ul>');

	// Load
	content = '';
	content += '<li>1 minute <p class="ui-li-aside">'+obj.load.min1+'</p></li>';
	htmlTag = getHtmlTag(obj.load.min5,0.7*obj.core_number,1*obj.core_number,5*obj.core_number);
	content += '<li><'+htmlTag.tag+'>5 minutes <p class="ui-li-aside">'+obj.load.min5+'</p></'+htmlTag.tag+'></li>';
	htmlTag = getHtmlTag(obj.load.min15,0.7*obj.core_number,1*obj.core_number,5*obj.core_number);
	highTag = htmlTag.level > highTag.level ? htmlTag : highTag;
	content += '<li><'+htmlTag.tag+'>15 minutes <p class="ui-li-aside">'+obj.load.min15+'</p></'+htmlTag.tag+'></li>';
	esd.append('<p>Load <span class="ui-h3-aside">'+obj.core_number+'-Core</span></p><ul data-role="listview" data-inset="true">'+content+'</ul>');

	// Network
	content = '';
	$.each(obj.network, function(i,item){
		content += '<li>'+item.interface_name+' <p class="ui-li-aside ui-li-aside-fwidth">'+bitsToSize(item.rx,1)+'</p><p class="ui-li-aside ui-li-aside-fwidth">'+bitsToSize(item.tx,1)+'</p></li>';
	});
	esd.append('<div data-role="collapsible" id="network"><h3>Network <span class="ui-li-aside-fwidth">Tx/s</span><span class="ui-li-aside-fwidth">Rx/s</span></h3><ul data-role="listview" data-inset="true">'+content+'</ul></div>');
	$('#network').bind( "collapse", function(event, ui) { $(this).find('span.ui-li-aside-fwidth').hide(); });
	$('#network').bind( "expand", function(event, ui) { $(this).find('span.ui-li-aside-fwidth').show(); });
	
	// Disk I/O
	content = '';
	$.each(obj.diskio, function(i,item){
		content += '<li>'+item.disk_name+' <p class="ui-li-aside ui-li-aside-fwidth">'+bytesToSize(item.read_bytes,1)+'</p><p class="ui-li-aside ui-li-aside-fwidth">'+bytesToSize(item.write_bytes,1)+'</p></li>';
	});
	esd.append('<div data-role="collapsible" id="diskio"><h3>Disk I/O <span class="ui-li-aside-fwidth">Out/s</span><span class="ui-li-aside-fwidth">In/s</span></h3><ul data-role="listview" data-inset="true">'+content+'</ul></div>');
	$('#diskio').bind( "collapse", function(event, ui) { $(this).find('span.ui-li-aside-fwidth').hide(); });
	$('#diskio').bind( "expand", function(event, ui) { $(this).find('span.ui-li-aside-fwidth').show(); });
	
	// Filesystem
	content = '';
	highTag = null;
	$.each(obj.fs, function(i,item){
		htmlTag = getHtmlTag(obj.fs.size * 100 - obj.fs.used,50,70,90);
		if(!highTag) highTag = htmlTag;
		highTag = htmlTag.level > highTag.level ? htmlTag : highTag;
		content += '<li><'+htmlTag.tag+'>'+item.mnt_point+' <p class="ui-li-aside ui-li-aside-fwidth">'+bytesToSize(item.size,1)+'</p><p class="ui-li-aside ui-li-aside-fwidth">'+bytesToSize(item.used,1)+'</'+htmlTag.tag+'></p></li>';
	});
	esd.append('<div data-role="collapsible" id="fsys"><h3><'+highTag.tag+'>Filesystem</'+highTag.tag+'> <span class="ui-li-aside-fwidth">Used</span><span class="ui-li-aside-fwidth">Total</span></h3><ul data-role="listview" data-inset="true">'+content+'</ul></div>');
	$('#fsys').bind( "collapse", function(event, ui) { $(this).find('span.ui-li-aside-fwidth').hide(); });
	$('#fsys').bind( "expand", function(event, ui) { $(this).find('span.ui-li-aside-fwidth').show(); });
	
	// Lastupdate
	esd.append('<p style="text-align:right;font-size: small;">Last updated: '+obj.lastupdate+'</p>');

	$('span.ui-li-aside-fwidth').hide();
	esd.trigger('create');
};

var loadLinuxCpuTemplate = function(elm) {
	if(!lobj) return;
	$.each(lobj.percpu, function(i, cpu){
		content = '';
		htmlTag = getHtmlTag(cpu.user,50,70,90);
		content += '<li><'+htmlTag.tag+'>User <p class="ui-li-aside">'+round(cpu.user,1)+'%</p></'+htmlTag.tag+'></li>';
		htmlTag = getHtmlTag(cpu.kernel,50,70,90);
		content += '<li><'+htmlTag.tag+'>Kernel <p class="ui-li-aside">'+round(cpu.kernel,1)+'%</p></'+htmlTag.tag+'></li>';
		htmlTag = getHtmlTag(cpu.nice,50,70,90);
		content += '<li><'+htmlTag.tag+'>Nice <p class="ui-li-aside">'+round(cpu.nice,1)+'%</p></'+htmlTag.tag+'></li>';
		htmlTag = getHtmlTag(100 - cpu.idle,50,70,90);
		elm.append('<ul data-role="listview" data-inset="true" data-divider-theme="a"><li data-role="list-divider"><'+htmlTag.tag+'>CPU #'+i+' <p class="ui-li-aside">'+round(100 - cpu.idle,1)+'%</p></'+htmlTag.tag+'></li>'+content+'</ul>');
	});
	
	elm.trigger('create');
};

var loadLinuxRamTemplate = function(elm) {
	if(!lobj) return;
	var mem = lobj.mem;
	content = '';
	content += '<li>Total <p class="ui-li-aside">'+bytesToSize(mem.total,1)+'</p></li>';
	content += '<li>Used <p class="ui-li-aside">'+bytesToSize(mem.used,1)+' ('+bytesToSize(mem.used - mem.cache,0)+')</p></li>';
	content += '<li>Free <p class="ui-li-aside">'+bytesToSize(mem.free,1)+' ('+bytesToSize(mem.free + mem.cache,0)+')</p></li>';
	elm.append('<ul data-role="listview" data-inset="true" data-divider-theme="a"><li data-role="list-divider">Mem <p class="ui-li-aside">'+mem.percent+'%</p></li>'+content+'</ul>');

	elm.trigger('create');
};

var loadLinuxSwapTemplate = function(elm) {
	if(!lobj) return;
	var mem = lobj.memswap;
	content = '';
	content += '<li>Total <p class="ui-li-aside">'+bytesToSize(mem.total,1)+'</p></li>';
	content += '<li>Used <p class="ui-li-aside">'+bytesToSize(mem.used,0)+'</p></li>';
	content += '<li>Free <p class="ui-li-aside">'+bytesToSize(mem.free,0)+'</p></li>';
	elm.append('<ul data-role="listview" data-inset="true" data-divider-theme="a"><li data-role="list-divider">Swap <p class="ui-li-aside">'+mem.percent+'%</p></li>'+content+'</ul>');

	elm.trigger('create');
};
