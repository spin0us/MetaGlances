<?php

function do_post_request($url, $data, $optional_headers = null)
{
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

// Retrieve Glances version
$init = '<?xml version="1.0"?><methodCall><methodName>init</methodName></methodCall>';
$output = do_post_request('http://'.$_POST['ipv4'].':'.$_POST['port'].'/RPC2', $init);
$xml = simplexml_load_string($output);
$version = $xml->params->param->value->string;

// Retrieve all data
$getAll = '<?xml version="1.0"?><methodCall><methodName>getAll</methodName></methodCall>';
$output = do_post_request('http://'.$_POST['ipv4'].':'.$_POST['port'].'/RPC2', $getAll);
$xml = simplexml_load_string($output);
$json = json_decode($xml->params->param->value->string);

// Add glances version in output
$json->host->glances_version = (string)$version;

echo json_encode($json);
