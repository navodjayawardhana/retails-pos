<?php

$publicPath = __DIR__;

$uri = urldecode(
    parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? ''
);

// Emulates Apache's "mod_rewrite" for the PHP built-in server so that
// client-side (BrowserRouter) routes fall through to Laravel's front
// controller instead of returning a raw 404 for non-file paths.
if ($uri !== '/' && file_exists($publicPath.$uri)) {
    return false;
}

require_once $publicPath.'/index.php';
