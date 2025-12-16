<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

date_default_timezone_set('UTC');

$no  = isset($_POST['no']) ? (int)$_POST['no'] : 0;
$msg = isset($_POST['msg']) ? (string)$_POST['msg'] : '';

$line = [
  'no' => $no,
  'time_server' => gmdate('c'),
  'msg' => substr($msg, 0, 300)
];

$path = __DIR__ . '/../data/server_log.jsonl';

if (!is_dir(dirname($path))) {
  mkdir(dirname($path), 0777, true);
}

$fp = fopen($path, 'ab');
if ($fp === false) {
  http_response_code(500);
  echo json_encode(['error' => 'cannot open log file']);
  exit;
}

flock($fp, LOCK_EX);
fwrite($fp, json_encode($line, JSON_UNESCAPED_UNICODE) . "\n");
flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['ok' => true, 'time_server' => $line['time_server']], JSON_UNESCAPED_UNICODE);
