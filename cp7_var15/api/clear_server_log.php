<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

$path = __DIR__ . '/../data/server_log.jsonl';
if (!is_dir(dirname($path))) {
  mkdir(dirname($path), 0777, true);
}
file_put_contents($path, '');
echo json_encode(['ok' => true]);
