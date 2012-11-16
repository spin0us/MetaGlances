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
var refreshPage = function() {
  $.mobile.changePage(
    window.location.href,
    {
      allowSamePageTransition : true,
      transition              : 'none',
      showLoadMsg             : false,
      reloadPage              : true
    }
  );
};

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
			$.ajax({
				url: 'serverRequest.php',
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
	$.ajax({
		url: 'config.php',
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
	$.ajax({
		url: 'config.php',
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
	esd.append('<h3>Information</h3><ul data-role="listview" data-inset="true">'+content+'</ul>');

	// Usage
	content = '';
	content += '<li><a href="#componentdetails" onClick="compclk=\'cpu\'">CPU <p class="ui-li-aside">'+round(obj.cpu.idle,1)+'%</p></a></li>';
	content += '<li>RAM <p class="ui-li-aside">'+obj.mem.percent+'%</p></li>';
	content += '<li>SWAP <p class="ui-li-aside">'+obj.memswap.percent+'%</p></li>';
	esd.append('<h3>Usage</h3><ul data-role="listview" data-inset="true">'+content+'</ul>');

	// Load Average
	content = '';
	content += '<li>1 minute <p class="ui-li-aside">'+obj.load.min1+'</p></li>';
	content += '<li>5 minutes <p class="ui-li-aside">'+obj.load.min5+'</p></li>';
	content += '<li>15 minutes <p class="ui-li-aside">'+obj.load.min15+'</p></li>';
	esd.append('<h3>Load Average</h3><ul data-role="listview" data-inset="true">'+content+'</ul>');

	esd.trigger('create');
};

var loadLinuxCpuTemplate = function(elm) {
	if(!lobj) return;
	$.each(lobj.percpu, function(i, cpu){
		content = '';
		content += '<li>CPU <p class="ui-li-aside">'+round(cpu.idle,1)+'%</p></li>';
		content += '<li>User <p class="ui-li-aside">'+round(cpu.user,1)+'%</p></li>';
		content += '<li>Kernel <p class="ui-li-aside">'+round(cpu.kernel,1)+'%</p></li>';
		content += '<li>Nice <p class="ui-li-aside">'+round(cpu.nice,1)+'%</p></li>';
		elm.append('<h3>CPU #'+i+'</h3><ul data-role="listview" data-inset="true">'+content+'</ul>');
	});
	
	elm.trigger('create');
};