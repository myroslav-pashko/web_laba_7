<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

$path = __DIR__ . '/../data/server_log.jsonl';
if (!file_exists($path)) {
  echo json_encode([], JSON_UNESCAPED_UNICODE);
  exit;
}

$lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
$out = [];

if (is_array($lines)) {
  foreach ($lines as $ln) {
    $row = json_decode($ln, true);
    if (is_array($row)) $out[] = $row;
  }
}

echo json_encode($out, JSON_UNESCAPED_UNICODE);
