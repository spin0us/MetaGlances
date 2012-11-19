<?php
/******************************************************************
 * Name         : serverRequest.php
 * Description  : MetaGlances XMLRPC gateway
 * Version      : PHP (5.3.10)
 * Author       : spin0us (github_[at]_spin0us_[dot]_net)
 * CreationDate : 15:45 16/11/2012
 ******************************************************************/
error_reporting(E_ALL);
ini_set('display_errors', '1');

define('CACHE_FILE_TTL', 2); // in minute(s)
define('CACHE_DIRECTORY', './cache/data/'); // server cache directory

function do_post_request($url, $data, $optional_headers = null) {
	$params = array('http' => array(
		'method' => 'POST',
		'content' => $data
		));
	if ($optional_headers !== null) {
		$params['http']['header'] = $optional_headers;
	}
	$ctx = stream_context_create($params);
	$fp = @fopen($url, 'rb', false, $ctx);
	if (!$fp) {
		header("HTTP/1.1 403 Forbidden");
		die();
	}
	$response = @stream_get_contents($fp);
	if ($response === false) {
		throw new Exception("Problem reading data from $url, $php_errormsg");
	}
	return $response;
}

// Check POST params
if( (!isset($_POST['ipv4']) && !isset($_POST['fqdn'])) || !isset($_POST['port']) ) {
	header("HTTP/1.1 400 Bad Request");
	die();
}
if( (empty($_POST['ipv4']) && empty($_POST['fqdn'])) || empty($_POST['port']) ) {
	header("HTTP/1.1 400 Bad Request");
	die();
}

// Clean cached old files
$files = scandir(CACHE_DIRECTORY);
foreach($files as $file) {
	if($file != '.' && $file != '..' && (time() - filemtime(CACHE_DIRECTORY.$file)) > (CACHE_FILE_TTL * 60)) {
		unlink(CACHE_DIRECTORY.$file);
	}
}

// Check token
$token = isset($_POST['token']) ? $_POST['token'] : md5('metaglances');

// Build server file name
$ipv4 = empty($_POST['ipv4']) ? gethostbyname($_POST['fqdn']) : $_POST['ipv4'];
$port = $_POST['port'];
$serverFileName = md5($ipv4.$port);

// Check cache
if(!file_exists(CACHE_DIRECTORY.$serverFileName))
{
	// Retrieve Glances version
	$init = '<?xml version="1.0"?><methodCall><methodName>init</methodName></methodCall>';
	$output = do_post_request('http://'.$ipv4.':'.$port.'/RPC2', $init);
	$xml = simplexml_load_string($output);
	$version = $xml->params->param->value->string;

	// Retrieve all data
	$getAll = '<?xml version="1.0"?><methodCall><methodName>getAll</methodName></methodCall>';
	$output = do_post_request('http://'.$ipv4.':'.$port.'/RPC2', $getAll);
	$xml = simplexml_load_string($output);
	$json = json_decode($xml->params->param->value->string);

	// Add glances version in output
	$json->host->glances = (string)$version;
	
	$json->lastupdate = date("d M y H:i:s");
	
	// Store in cache
	file_put_contents(CACHE_DIRECTORY.$serverFileName,json_encode($json));
}

header("Expires: Mon, 26 Jul 1997 05:00:00 GMT" );
header("Last-Modified: " . gmdate("D, d M Y H:i:s" ) . " GMT" );
header("Cache-Control: no-cache, must-revalidate" );
header("Pragma: no-cache" );
echo file_get_contents(CACHE_DIRECTORY.$serverFileName);
