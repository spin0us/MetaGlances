<?php
/******************************************************************
 * Name         : config.php
 * Description  : MetaGlances cloud config backup
 * Version      : PHP (5.3.10)
 * Author       : spin0us (github_[at]_spin0us_[dot]_net)
 * CreationDate : 17:21 16/11/2012
 ******************************************************************/

$authorized_users = array('user@domain.dsn', 'another@one.dsn');
 
define('CACHE_DIRECTORY', './cache/config/'); // server cache directory

function encryptData($key, $data) {
	$iv_size = mcrypt_get_iv_size(MCRYPT_RIJNDAEL_256, MCRYPT_MODE_ECB);
	$iv = mcrypt_create_iv($iv_size, MCRYPT_RAND);
	$crypttext = mcrypt_encrypt(MCRYPT_RIJNDAEL_256, $key, $data, MCRYPT_MODE_ECB, $iv);
	return base64_encode($crypttext);
}

function decryptData($key, $data) {
	$iv_size = mcrypt_get_iv_size(MCRYPT_RIJNDAEL_256, MCRYPT_MODE_ECB);
	$iv = mcrypt_create_iv($iv_size, MCRYPT_RAND);
	$cleartext = mcrypt_decrypt(MCRYPT_RIJNDAEL_256, $key, base64_decode($data), MCRYPT_MODE_ECB, $iv);
	return $cleartext;
}

// Check POST params
if( !isset($_POST['mail']) || !isset($_POST['pass']) ) {
	header("HTTP/1.1 400 Bad Request");
	die();
}

// Check if user if authorized
if(!in_array($_POST['mail'], $authorized_users)) {
    header("HTTP/1.1 403 Forbidden");
    die();
}

// Check token
$token = md5($_POST['mail'].$_POST['pass']);

// Store config
if(isset($_POST['conf'])) {
	file_put_contents(CACHE_DIRECTORY.$_POST['mail'],encryptData($token, $_POST['conf']));
	echo 'done';
}
// Restore config
else {
	if(file_exists(CACHE_DIRECTORY.$_POST['mail'])) {
		$conf = decryptData($token, file_get_contents(CACHE_DIRECTORY.$_POST['mail']));
        $conf = trim($conf);
		echo empty($conf) ? '[]' : $conf;
	}
	else {
		echo '[]';
	}
}
