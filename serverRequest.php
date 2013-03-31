<?php
/******************************************************************
 * Name         : serverRequest.php
 * Description  : MetaGlances XMLRPC gateway
 * Version      : PHP (5.3.10)
 * Author       : spin0us (github_[at]_spin0us_[dot]_net)
 * CreationDate : 15:45 16/11/2012
 ******************************************************************
 * CHANGE LOG
 * 15:12 21/11/2012 - spin0us - add custom refresh rate support
 *								fix network and diskio rates
 ******************************************************************/
error_reporting(E_ALL);
ini_set('display_errors', '1');

define('CACHE_FILE_TTL', 2); // in minute(s)
define('CACHE_DIRECTORY', './cache/data/'); // server cache directory

if (!function_exists('do_post_request'))
{
    /**
     * Send a POST request using the more wide method
     *
     * @name        do_post_request()
     * @param       [$url]                  string
     * @param       [$data]                 string or array
     * @param       [$optional_headers]     string or array
     * @return      void
     */
    function do_post_request($url, $data, $optional_headers = null)
    {
        if (is_array($data))
        {
            $in_line = '';
            foreach ($data as $key => $val)
            {
                $in_line .= $key . '=' . $val . '&';
            }
            $data = trim($in_line, '&');
        }
        $params = array('http' => array(
            'method' => 'POST',
            'content' => $data
            ));
        if ($optional_headers !== null)
        {
            if (is_array($optional_headers))
            {
                $in_line = '';
                foreach ($optional_headers as $key => $val)
                {
                    $in_line .= $key . ': ' . $val . "\r\n";
                }
                $optional_headers = trim($in_line);
            }
            $params['http']['header'] = $optional_headers;
        }
        $ctx = stream_context_create($params);
        $stream = @fopen($url, 'rb', false, $ctx);
        if (!$stream)
        {
            if(isset($php_errormsg) && preg_match("/401/", $php_errormsg)) header("HTTP/1.1 401 Authentication failed");
            else header("HTTP/1.1 403 Forbidden");
            die();
        }
        $response = @stream_get_contents($stream);
        fclose($stream);
        if ($response === false || empty($response))
        {
            throw new Exception("Problem reading data from $url");
        }
        return $response;
    }
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

// Refresh rate
// $refresh_rate = (isset($_POST['refr']) && in_array($_POST['refr'],array(1,2,3,4,5)) ? $_POST['refr'] : CACHE_FILE_TTL) * 60;
$refresh_rate = 5 * 60;

// Clean cached old files
$files = scandir(CACHE_DIRECTORY);
foreach($files as $file) {
	if($file != '.' && $file != '..' && (time() - filemtime(CACHE_DIRECTORY.$file)) > (6 * 60)) {
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
if(!file_exists(CACHE_DIRECTORY.$serverFileName) || (time() - filemtime(CACHE_DIRECTORY.$serverFileName)) > $refresh_rate)
{
    $authorization_header = (isset($_POST['pass']) && !empty($_POST['pass'])) ? "Authorization: Basic ".base64_encode("glances:".$_POST['pass'])."\r\n" : null;

	// Retrieve Glances version
	$init = '<?xml version="1.0"?><methodCall><methodName>init</methodName></methodCall>';
	$output = do_post_request('http://'.$ipv4.':'.$port.'/RPC2', $init, $authorization_header);
	$xml = simplexml_load_string($output);
	$version = $xml->params->param->value->string;

	// Retrieve all data
	$getAll = '<?xml version="1.0"?><methodCall><methodName>getAll</methodName></methodCall>';
	$output = do_post_request('http://'.$ipv4.':'.$port.'/RPC2', $getAll, $authorization_header);
	$xml = simplexml_load_string($output);
	$json = json_decode($xml->params->param->value->string);

    // Retrieve all limits
	$getAll = '<?xml version="1.0"?><methodCall><methodName>getAllLimits</methodName></methodCall>';
	$output = do_post_request('http://'.$ipv4.':'.$port.'/RPC2', $getAll, $authorization_header);
	$xml = simplexml_load_string($output);
    $json->limits = json_decode($xml->params->param->value->string);
    // Update LOAD limits with core number
    $json->limits->LOAD[0] *= $json->core_number;
    $json->limits->LOAD[1] *= $json->core_number;
    $json->limits->LOAD[2] *= $json->core_number;

	// Add glances version in output
	$json->host->glances = (string)$version;
	
	$json->lastupdate = gmdate("d M y H:i:s");
	$json->ts = time();

	// Store in cache
	file_put_contents(CACHE_DIRECTORY.$serverFileName,json_encode($json));
}

header("Expires: Mon, 26 Jul 1997 05:00:00 GMT" );
header("Last-Modified: " . gmdate("D, d M Y H:i:s" ) . " GMT" );
header("Cache-Control: no-cache, must-revalidate" );
header("Pragma: no-cache" );
echo file_get_contents(CACHE_DIRECTORY.$serverFileName);
