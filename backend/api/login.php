<?php
require __DIR__ . '/../bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Metodo non consentito']);
  exit;
}
$data = jsonBody();
$email = strtolower(trim((string)($data['email'] ?? '')));
$password = (string)($data['password'] ?? '');
if ($email === '' || $password === '') {
  http_response_code(422);
  echo json_encode(['error' => 'Email e password obbligatorie']);
  exit;
}
$stmt = $pdo->prepare('SELECT id,email,password_hash,role,active FROM coach_users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();
if (!$user || !$user['active'] || !password_verify($password, $user['password_hash'])) {
  http_response_code(401);
  echo json_encode(['error' => 'Credenziali non valide']);
  exit;
}
session_regenerate_id(true);
$_SESSION['user'] = ['id' => (int)$user['id'], 'email' => $user['email'], 'role' => $user['role']];
echo json_encode(['ok' => true, 'user' => $_SESSION['user']]);
