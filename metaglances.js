var build = "5";
var selectedServer, lobj, compclk;
var servers = null;

var UCFirst = function(string) { return string.charAt(0).toUpperCase() + string.slice(1); };
var round = function(fval,dec) { return dec > 0 ? (Math.round(fval * 10 * dec) / (10 * dec)) : Math.round(fval); };
var getHtmlTag = function(val,ref) { return {tag: (val > ref[2] ? 'critical' : (val > ref[1] ? 'warning' : (val > ref[0] ? 'careful' : 'span'))), level: (val > ref[2] ? 3 : (val > ref[1] ? 2 : (val > ref[0] ? 1 : 0))) }; };
var bytesToSize = function(bytes, dec) { var sizes = ['B', 'K', 'M', 'G', 'T']; if (bytes == 0) return '0'; var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024))); return round(bytes / Math.pow(1024, i), dec) + sizes[i]; };
var bitsToSize = function(bits, dec) { var sizes = ['b', 'Kb', 'Mb', 'Gb', 'Tb']; if (bits == 0) return '0'; var i = parseInt(Math.floor(Math.log(bits) / Math.log(1000))); return round(bits / Math.pow(1000, i), dec) + sizes[i]; };
var displayPopup = function(selector, message) { $('#'+selector+' > p#msg').html(message).trigger('create'); $('#'+selector).popup("open"); };
var getStorage = function(elm) { return localStorage.getItem(elm) !== null ? JSON.parse(localStorage.getItem(elm)) : null; };
var setStorage = function(elm,val) { localStorage.setItem(elm, JSON.stringify(val)); };
var delStorage = function(elm) { localStorage.removeItem(elm); };

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
	if(servers !== null) return;
	// Load Storage datas
	try {
		// First use on this device (install)
		if(typeof(localStorage.build)==="undefined" || typeof(localStorage.servers)==="undefined")
		{
			localStorage.build = build;
			setStorage('servers', []);
		}
		
		servers = getStorage('servers');
		
		// Build change (update)
		if(localStorage.build < build){
            if(servers) {
                // THINGS TODO ON UPDATE
                $.each(servers, function(i,item){
                    if(typeof(item.fqdn)==="undefined") item.fqdn = ''; // (b2+)
                    if(typeof(item.refr)==="undefined") item.refr = '2'; // 2 minutes is the default refresh rate value (b4+)
                    if(typeof(item.pass)==="undefined") item.pass = ''; // empty password
                });
                setStorage('servers', servers);
            }
			// Update build number
			localStorage.build = build;
		}

		if(getStorage('config') !== null) {
			var user = getStorage('config');
			$('#user').show().html('Logged as : <b>'+user.mail+'</b>');
		}
		else{
			$('#user').hide();
		}

		if(servers && servers.length){
			$('ul#serverList').empty().append('<li data-role="list-divider" role="heading">Server List</li>');
			$.each(servers, function(i,item){
				$('ul#serverList').append('<li><a href="#serverdetails" id="srv-'+i+'">'+item.desc+'</a></li>');
			});
			$('ul#serverList > li > a').bind('click', function(event, ui) {
				selectedServer = $(this).attr('id').split('-')[1];
			});
		}
		else{
			$('ul#serverList').empty().append('<li data-role="list-divider" role="heading">Server List</li><li>- empty -</li>');
		}
		$('ul#serverList').listview('refresh');
	} catch(err){
		displayPopup('popupNotSupported', 'Sorry! No web storage support...');
        console.log(err);
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
				data: 'fqdn='+srv.fqdn+'&ipv4='+srv.ipv4+'&port='+srv.port+'&refr='+srv.refr+'&pass='+srv.pass,
				type: 'post',
				contentType: "application/x-www-form-urlencoded",
				success : function(response, status, jqXHR) {
					$('#serverData').html('');
					var obj = JSON.parse(response);
					lobj = obj;
					loadLinuxTemplate(lobj);
				},
				error : function (xhr, ajaxOptions, thrownError){
					$('#serverData').html('');
                    if(xhr.status == 401)
                        displayPopup('popupDetails', 'Missing or bad password!');
                    else
                        displayPopup('popupDetails', 'Server not responding!');
				} 
			});
		}
	}
});
$('#serverDelete').bind('click', function(event, ui) {
	if(selectedServer) {
		servers.splice(selectedServer,1);
		setStorage('servers', servers);
		servers = null; // Force home server list to refresh
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
$('#serverform').bind('pagebeforeshow',function(event, data){
	if(!servers) {
		$.mobile.changePage($("#home"));
	}
    if(data.prevPage.attr('id') === 'serverdetails') {
        // Change settings of an existing server
        var srv = servers[selectedServer];
        $('input[name="fqdn"]').val(srv.fqdn);
        $('input[name="ipv4"]').val(srv.ipv4);
        $('input[name="desc"]').val(srv.desc);
        $('input[name="pass"]').val(srv.pass);
        $('input[name="refr"]:radio[value="'+srv.refr+'"]').click();
    }
    else {
        // Reinit input values
        $('input[name="fqdn"]').val('');
        $('input[name="ipv4"]').val('');
        $('input[name="desc"]').val('');
        $('input[name="pass"]').val('');
        $('input[name="refr"]:radio[value="2"]').click();
    }
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
	var pass_val = $('input[name="pass"]').val();
	var refr_val = $('input:radio[name="refr"]:checked').val();
	if(desc_val == '') desc_val = (fqdn_val == '' ? ipv4_val : fqdn_val);
	// Test values with patterns
	if((fqdnPattern.test(fqdn_val) || ipv4Pattern.test(ipv4_val)) && portPattern.test(port_val)){
        // Change settings of an existing server
        if(selectedServer) {
            servers.splice(selectedServer,1);
            selectedServer = null;
        }
		// Check if server not already in collection
		var alreadyExists = false;
		$.each(servers, function(i,item){
			if(item.fqdn != "" && item.fqdn == fqdn_val) alreadyExists = true;
			if(item.ipv4 != "" && item.ipv4 == ipv4_val) alreadyExists = true;
		});
		// Store the new server
		if(!alreadyExists){
			servers.push({fqdn:fqdn_val,ipv4:ipv4_val,port:port_val,desc:desc_val,pass:pass_val,refr:refr_val});
			servers.sort(function(a,b) {return (a.desc > b.desc) ? 1 : ((b.desc > a.desc) ? -1 : 0);});
			setStorage('servers', servers);
			servers = null; // Force home server list to refresh
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
	if(getStorage('config') === null) {
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
	setStorage('config', {mail:$('#fldMail').val(),pass:$('#fldPass').val()});
	$('#signout').toggle();
	$('#guest').toggle();
	$('#registered').toggle();
});
$('#signout').click(function(){
	delStorage('config');
	$('#signout').toggle();
	$('#guest').toggle();
	$('#registered').toggle();
	$('#fldMail').val('');
	$('#fldPass').val('');
});
$('#btnRestore').click(function(){
	var user = getStorage('config');
	var cacheVar = new Date().getTime();
	$.ajax({
		url: 'config.php?'+cacheVar,
		data: 'mail='+user.mail+'&pass='+user.pass,
		type: 'post',
		contentType: "application/x-www-form-urlencoded",
		success : function(response, status, jqXHR) { 
            var testJsonFormat = JSON.parse(response);
            if(typeof testJsonFormat =='object') {
                localStorage.servers = response;
                servers = null; // Force home server list to refresh
                displayPopup('popupCloud', 'Restore completed ...');
            }
            else
                displayPopup('popupCloud', 'Restoration failed !');
		},
		error : function (xhr, ajaxOptions, thrownError){
			displayPopup('popupCloud', 'Restoration failed !');
		} 
	});
});
$('#btnStore').click(function(){
	var user = getStorage('config');
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
	esd.append('<div data-role="collapsible"><h3>Informations</h3><ul data-role="listview" data-inset="true">'+content+'</ul></div>');

	// Usage
	content = '';
	// Cpu
	htmlTag = getHtmlTag(100 - obj.cpu.idle,obj.limits.STD);
	highTag = htmlTag;
	content += '<li><a href="#componentdetails" onClick="compclk=\'cpu\'"><'+htmlTag.tag+'>CPU <p class="ui-li-aside">'+round(100 - obj.cpu.idle,1)+'%</p></'+htmlTag.tag+'></a></li>';
	// Ram
	htmlTag = getHtmlTag(obj.mem.percent,obj.limits.MEM);
	highTag = htmlTag.level > highTag.level ? htmlTag : highTag;
	content += '<li><a href="#componentdetails" onClick="compclk=\'ram\'"><'+htmlTag.tag+'>RAM <p class="ui-li-aside">'+obj.mem.percent+'%</p></'+htmlTag.tag+'></a></li>';
	// Swap
	htmlTag = getHtmlTag(obj.memswap.percent,obj.limits.SWAP);
	highTag = htmlTag.level > highTag.level ? htmlTag : highTag;
	content += '<li><a href="#componentdetails" onClick="compclk=\'swap\'"><'+htmlTag.tag+'>SWAP <p class="ui-li-aside">'+obj.memswap.percent+'%</p></'+htmlTag.tag+'></a></li>';
	esd.append('<p>Usage</p><ul data-role="listview" data-inset="true">'+content+'</ul>');

	// Load
	content = '';
	content += '<li>1 minute <p class="ui-li-aside">'+obj.load.min1+'</p></li>';
	htmlTag = getHtmlTag(obj.load.min5,obj.limits.LOAD);
	content += '<li><'+htmlTag.tag+'>5 minutes <p class="ui-li-aside">'+obj.load.min5+'</p></'+htmlTag.tag+'></li>';
	htmlTag = getHtmlTag(obj.load.min15,obj.limits.LOAD);
	highTag = htmlTag.level > highTag.level ? htmlTag : highTag;
	content += '<li><'+htmlTag.tag+'>15 minutes <p class="ui-li-aside">'+obj.load.min15+'</p></'+htmlTag.tag+'></li>';
	esd.append('<p>Load <span class="ui-h3-aside">'+obj.core_number+'-Core</span></p><ul data-role="listview" data-inset="true">'+content+'</ul>');

	// Network
	content = '';
	$.each(obj.network, function(i,item){
		content += '<li>'+item.interface_name+' <p class="ui-li-aside ui-li-aside-fwidth">'+bitsToSize(item.rx * 8 / item.time_since_update,1)+'</p><p class="ui-li-aside ui-li-aside-fwidth">'+bitsToSize(item.tx * 8 / item.time_since_update,1)+'</p></li>';
	});
	esd.append('<div data-role="collapsible" id="network"><h3>Network <span class="ui-li-aside-fwidth">Tx/s</span><span class="ui-li-aside-fwidth">Rx/s</span></h3><ul data-role="listview" data-inset="true">'+content+'</ul></div>');
	$('#network').bind( "collapse", function(event, ui) { $(this).find('span.ui-li-aside-fwidth').hide(); });
	$('#network').bind( "expand", function(event, ui) { $(this).find('span.ui-li-aside-fwidth').show(); });
	
	// Disk I/O
	content = '';
	$.each(obj.diskio, function(i,item){
		content += '<li>'+item.disk_name+' <p class="ui-li-aside ui-li-aside-fwidth">'+bytesToSize(item.write_bytes / item.time_since_update,1)+'</p><p class="ui-li-aside ui-li-aside-fwidth">'+bytesToSize(item.read_bytes / item.time_since_update,1)+'</p></li>';
	});
	esd.append('<div data-role="collapsible" id="diskio"><h3>Disk I/O <span class="ui-li-aside-fwidth">Out/s</span><span class="ui-li-aside-fwidth">In/s</span></h3><ul data-role="listview" data-inset="true">'+content+'</ul></div>');
	$('#diskio').bind( "collapse", function(event, ui) { $(this).find('span.ui-li-aside-fwidth').hide(); });
	$('#diskio').bind( "expand", function(event, ui) { $(this).find('span.ui-li-aside-fwidth').show(); });
	
	// Filesystem
	content = '';
	highTag = null;
	$.each(obj.fs, function(i,item){
		htmlTag = getHtmlTag(obj.fs.size * 100 - obj.fs.used,obj.limits.FS);
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
		htmlTag = getHtmlTag(cpu.user,lobj.limits.CPU_USER);
		content += '<li><'+htmlTag.tag+'>User <p class="ui-li-aside">'+round(cpu.user,1)+'%</p></'+htmlTag.tag+'></li>';
		htmlTag = getHtmlTag(cpu.system,lobj.limits.CPU_SYSTEM);
		content += '<li><'+htmlTag.tag+'>System <p class="ui-li-aside">'+round(cpu.system,1)+'%</p></'+htmlTag.tag+'></li>';
		htmlTag = getHtmlTag(cpu.nice,lobj.limits.STD);
		content += '<li><'+htmlTag.tag+'>Nice <p class="ui-li-aside">'+round(cpu.nice,1)+'%</p></'+htmlTag.tag+'></li>';
		htmlTag = getHtmlTag(cpu.iowait,lobj.limits.CPU_IOWAIT);
		content += '<li><'+htmlTag.tag+'>IoWait <p class="ui-li-aside">'+round(cpu.iowait,1)+'%</p></'+htmlTag.tag+'></li>';
		htmlTag = getHtmlTag(cpu.irq,lobj.limits.STD);
		content += '<li><'+htmlTag.tag+'>IRQ <p class="ui-li-aside">'+round(cpu.irq,1)+'%</p></'+htmlTag.tag+'></li>';
		htmlTag = getHtmlTag(100 - cpu.idle,lobj.limits.STD);
		elm.append('<ul data-role="listview" data-inset="true" data-divider-theme="a"><li data-role="list-divider"><'+htmlTag.tag+'>CPU #'+i+' <p class="ui-li-aside">'+round(100 - cpu.idle,1)+'%</p></'+htmlTag.tag+'></li>'+content+'</ul>');
	});
	
	elm.trigger('create');
};

var loadLinuxRamTemplate = function(elm) {
	if(!lobj) return;
	var mem = lobj.mem;
	content = '';
	content += '<li>Total <p class="ui-li-aside">'+bytesToSize(mem.total,1)+'</p></li>';
	content += '<li>Used <p class="ui-li-aside">'+bytesToSize(mem.used,1)+'</p></li>';
	content += '<li>Free <p class="ui-li-aside">'+bytesToSize(mem.free,1)+'</p></li>';
	content += '<li>Active <p class="ui-li-aside">'+bytesToSize(mem.active,1)+'</p></li>';
	content += '<li>Inactive <p class="ui-li-aside">'+bytesToSize(mem.inactive,1)+'</p></li>';
	content += '<li>Buffers <p class="ui-li-aside">'+bytesToSize(mem.buffers,1)+'</p></li>';
	content += '<li>Cached <p class="ui-li-aside">'+bytesToSize(mem.cached,1)+'</p></li>';
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
