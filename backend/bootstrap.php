<?php
$configPath = __DIR__ . '/config.php';
if (!is_file($configPath)) {
  http_response_code(500);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['error' => 'Backend non configurato']);
  exit;
}
$config = require $configPath;

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === ($config['allowed_origin'] ?? '')) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Access-Control-Allow-Credentials: true');
  header('Vary: Origin');
}
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

session_name($config['session_name'] ?? 'osgb_coach_session');
session_set_cookie_params([
  'lifetime' => 0,
  'path' => '/',
  'secure' => true,
  'httponly' => true,
  'samesite' => 'None',
]);
session_start();

try {
  $pdo = new PDO(
    $config['db']['dsn'],
    $config['db']['user'],
    $config['db']['pass'],
    [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES => false,
    ]
  );
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => 'Connessione database non disponibile']);
  exit;
}

function jsonBody(): array {
  $raw = file_get_contents('php://input');
  if ($raw === false || trim($raw) === '') return [];
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function requireLogin(): array {
  if (empty($_SESSION['user']) || !is_array($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Autenticazione richiesta']);
    exit;
  }
  return $_SESSION['user'];
}

function requireAdmin(): array {
  $user = requireLogin();
  if (($user['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Permessi insufficienti']);
    exit;
  }
  return $user;
}
