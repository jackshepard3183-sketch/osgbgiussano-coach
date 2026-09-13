<?php
require __DIR__ . '/../bootstrap.php';
$user = requireLogin();
echo json_encode(['ok' => true, 'user' => $user]);
