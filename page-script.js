var build = "2";
var selectedServer, lobj, compclk;
var servers = null;

var formatOutput = {
	idle: {
		title: "used",
		value: function(a) { var value = Math.round((100 - a) * 10) / 10; return {disp:value+'%',val:value};},
		careful:50,
		warning:70,
		critical:90,
		},
};
var UCFirst = function(string) { return string.charAt(0).toUpperCase() + string.slice(1); };
var round = function(fval,dec) { return dec > 0 ? (Math.round(fval * 10 * dec) / (10 * dec)) : Math.round(fval); };
var getHtmlTag = function(val,care,warn,crit) {
	return {
		tag: (val > crit ? 'critical' : (val > warn ? 'warning' : (val > care ? 'careful' : 'span'))),
		level: (val > crit ? 3 : (val > warn ? 2 : (val > care ? 1 : 0)))
	};
};
var bytesToSize = function(bytes, dec) {
    var sizes = ['Bytes', 'K', 'M', 'G', 'T'];
    if (bytes == 0) return 'n/a';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return round(bytes / Math.pow(1024, i), dec) + sizes[i];
};

$.ajaxSetup({ cache: false });

// Splash
function hideSplash() { console.log('hideSplash'); $.mobile.changePage("#home", "fade"); }
$('#splash').bind('pageshow',function(event){
	setTimeout(hideSplash, 2000);
});

// Home
$('#home').bind('pageshow',function(event){
	selectedServer = null;
	lobj = null;
	// Load Storage datas
	try {
		// Reinit localStorage.servers for lower build
		if(typeof(localStorage.build)==="undefined" || localStorage.build < build){
			localStorage.build = build;
			// localStorage.removeItem("servers");
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
				console.log("selectedServer: "+selectedServer);
			});
			$('ul#serverList').listview('refresh');
		}
		else {
			$('ul#serverList').empty().append('<li data-role="list-divider" role="heading">Server List</li><li>- empty -</li>');
			$('ul#serverList').listview('refresh');
		}
	} catch(err) {
		$('#popupNotSupported').html("<p>Sorry! No web storage support...</p>").popup("open");
	}
});

// ServerDetails
$('#serverdetails').bind('pagebeforeshow',function(event, page){
	console.log(page.prevPage.attr('id'));
	if(!servers || !selectedServer) {
		console.log('#serverdetails > pagebeforeshow');
		$.mobile.changePage($("#home"));
	}
	else {
		var srv = servers[selectedServer];
		if(page.prevPage.attr('id') == "home") {
			$('#serverData').html('<div style="text-align: center;"><img src="images/ajax-loader.gif"></div>');
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
					$('#popupDetails').popup("open").bind();
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
	console.log('#serverDelete > click');
	$.mobile.changePage($("#home"));
});

// ComponentDetails
$('#componentdetails').bind('pagebeforeshow',function(event, page){
	console.log('Request for : ' + compclk);
	if(!lobj || typeof(compclk) === "undefined") {
		console.log('#componentdetails > pagebeforeshow');
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
		console.log('#serverform > pagebeforeshow');
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
			console.log('#formSave > click');
			$.mobile.changePage($("#home"), { transition: "flip"} );
		}
		else {
			$('#popupForm').html("<p>Server already exists</p>").popup("open");
		}
	}
	else {
		$('#popupForm').html("<p>Invalid format !</p>").popup("open");
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
			console.log(status + ' ' + response);
			localStorage.servers = response;
			servers = JSON.parse(localStorage.servers);
			$('#popupCloud').html("<p>Restore completed ...</p>").popup("open");
		},
		error : function (xhr, ajaxOptions, thrownError){
			$('#popupCloud').html("<p>Restoration failed !</p>").popup("open");
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
			$('#popupCloud').html("<p>Backup completed ...</p>").popup("open");
		},
		error : function (xhr, ajaxOptions, thrownError){
			$('#popupCloud').html("<p>Backup failed !</p>").popup("open");
		} 
	});
});

// Data display template
var loadLinuxTemplate = function(obj) {
	var esd = $('#serverData');
	var content;
	
	// Information
	content = '';
	$.each(obj.host, function(i,item){
		var title = UCFirst(i.replace('_',' '));
		content += '<li>'+title+' <p class="ui-li-aside">'+item+'</p></li>';
	});
	esd.append('<div data-role="collapsible"><h3>Information</h3><ul data-role="listview" data-inset="true">'+content+'</ul></div>');

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
	content += '<li><'+htmlTag.tag+'>SWAP <p class="ui-li-aside">'+obj.memswap.percent+'%</p></'+htmlTag.tag+'></li>';
	esd.append('<div data-role="collapsible"><h3><'+highTag.tag+'>Usage</'+highTag.tag+'></h3><ul data-role="listview" data-inset="true">'+content+'</ul></div>');

	// Load Average
	content = '';
	content += '<li>1 minute <p class="ui-li-aside">'+obj.load.min1+'</p></li>';
	content += '<li>5 minutes <p class="ui-li-aside">'+obj.load.min5+'</p></li>';
	content += '<li>15 minutes <p class="ui-li-aside">'+obj.load.min15+'</p></li>';
	esd.append('<div data-role="collapsible"><h3>Load Average</h3><ul data-role="listview" data-inset="true">'+content+'</ul></div>');

	// Lastupdate
	esd.append('<p style="text-align:right;font-size: small;">Last update: '+obj.lastupdate+'</p>');

	esd.trigger('create');
};

var loadLinuxCpuTemplate = function(elm) {
	if(!lobj) return;
	$.each(lobj.percpu, function(i, cpu){
		content = '';
		htmlTag = getHtmlTag(100 - cpu.idle,50,70,90);
		content += '<li><'+htmlTag.tag+'>CPU <p class="ui-li-aside">'+round(100 - cpu.idle,1)+'%</p></'+htmlTag.tag+'></li>';
		htmlTag = getHtmlTag(cpu.user,50,70,90);
		content += '<li><'+htmlTag.tag+'>User <p class="ui-li-aside">'+round(cpu.user,1)+'%</p></'+htmlTag.tag+'></li>';
		htmlTag = getHtmlTag(cpu.kernel,50,70,90);
		content += '<li><'+htmlTag.tag+'>Kernel <p class="ui-li-aside">'+round(cpu.kernel,1)+'%</p></'+htmlTag.tag+'></li>';
		htmlTag = getHtmlTag(cpu.nice,50,70,90);
		content += '<li><'+htmlTag.tag+'>Nice <p class="ui-li-aside">'+round(cpu.nice,1)+'%</p></'+htmlTag.tag+'></li>';
		elm.append('<ul data-role="listview" data-inset="true" data-divider-theme="a"><li data-role="list-divider">CPU #'+i+'</li>'+content+'</ul>');
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