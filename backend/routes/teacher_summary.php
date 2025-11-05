<?php
declare(strict_types=1);

require_once __DIR__ . '/../api/headers.php';
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') { http_response_code(405); echo json_encode(['error' => 'Method Not Allowed']); exit; }

require_once __DIR__ . '/../models/Teacher.php';
require_once __DIR__ . '/../config/connection.php';

function startsWith($haystack, $needle) {
  return strncmp($haystack, $needle, strlen($needle)) === 0;
}

function safe_get(string $key, $default = null) {
  return isset($_GET[$key]) ? trim(strval($_GET[$key])) : $default;
}

$program = safe_get('program', '');
$programIdParam = isset($_GET['program_id']) ? intval($_GET['program_id']) : null;
$school_year = safe_get('school_year', '2024-2025');
$semester = safe_get('semester', '1st');
$period = safe_get('period', 'All'); // All | P1 | P2 | P3
$debug = (strtolower(safe_get('debug', '0')) === '1' || strtolower(safe_get('debug', 'false')) === 'true');

$db = new DatabaseConnection();
$pdo = $db->pdo();
$teacherModel = new TeacherModel($pdo);

// Resolve program id if a non-empty program name is provided and program_id is not set
$programId = null;
if ($programIdParam && $programIdParam > 0) {
  $programId = $programIdParam;
} else if ($program !== '') {
  $stmt = $pdo->prepare('SELECT id FROM programs WHERE program_name = ? LIMIT 1');
  $stmt->execute([$program]);
  $found = $stmt->fetch();
  if ($found && isset($found['id'])) { $programId = intval($found['id']); }
}

$teachers = $teacherModel->all();
// Recompute per-teacher aggregated stats based on filters, but preserve period-specific fields
// Period-specific fields (p1_percent, p2_percent, p3_percent, etc.) should come from database
$teachersEnriched = [];
foreach ($teachers as $t) {
  $stats = $teacherModel->aggregateStatsForTeacher(intval($t['id']), $school_year, $semester, $programId);
  $enrolled = intval($stats['enrolled_students'] ?? 0);
  $failed = intval($stats['failed_students'] ?? 0);
  
  // Only update overall stats, preserve period-specific fields from database
  $enriched = array_merge($t, [
    'enrolled_students' => $enrolled,
    'failed_students' => $failed,
    'failure_percentage' => $stats['failure_percentage'] ?? $t['failure_percentage'] ?? 0.00,
  ]);
  // Preserve period-specific fields from original teacher data
  // These fields (p1_percent, p2_percent, p3_percent, p1_failed, p2_failed, p3_failed, etc.) 
  // should remain from the database, not be overwritten by aggregateStatsForTeacher
  $teachersEnriched[] = $enriched;
}
// Filter teachers: include those with enrolled students matching filters OR those with period-specific data
// Period-specific data (p1_percent, p2_percent, p3_percent) should be counted even if overall enrolled is 0
$teachers = array_values(array_filter($teachersEnriched, function($t) {
  // Include if has enrolled students matching filters
  if (intval($t['enrolled_students'] ?? 0) > 0) {
    return true;
  }
  // Also include if has any period-specific data (percent, failed, or category)
  foreach (['p1', 'p2', 'p3'] as $pk) {
    $hasPercent = isset($t[$pk . '_percent']) && $t[$pk . '_percent'] !== null && $t[$pk . '_percent'] !== '';
    $hasFailed = isset($t[$pk . '_failed']) && intval($t[$pk . '_failed'] ?? 0) > 0;
    $hasCategory = isset($t[$pk . '_category']) && trim($t[$pk . '_category'] ?? '') !== '';
    if ($hasPercent || $hasFailed || $hasCategory) {
      return true;
    }
  }
  return false;
}));

$periods = ['P1','P2','P3'];
$selectedPeriods = ($period === 'All') ? $periods : [$period];
$totalTeachers = count($teachers);

// Helper: map category label to zone
function zoneFromCategoryLabel(string $cat): ?string {
  $u = strtoupper(trim($cat));
  if ($u === '') return null;
  if (str_starts_with($u, 'RED')) return 'red';
  if (str_starts_with($u, 'YELLOW')) return 'yellow';
  if (str_starts_with($u, 'GREEN')) return 'green';
  return null;
}

// Helper: zone from percentage using 10/40 thresholds
function zoneFromPercent(float $pct): string {
  if ($pct <= 0) return 'green';
  if ($pct <= 10) return 'green';
  if ($pct <= 40) return 'yellow';
  return 'red';
}

// Helper: determine zone for a teacher row in a given period key ('p1'|'p2'|'p3')
function zoneForTeacherPeriod(array $t, string $pk): ?string {
  // When filters (especially program) are applied, prefer recomputed aggregate stats
  // so counts reflect the filtered dataset rather than imported period values.
  // This avoids teachers being counted in zones that do not belong to the selected filters.
  global $programId; // detect program filter presence
  $percentKey = $pk . '_percent';
  $failedKey = $pk . '_failed';
  $categoryKey = $pk . '_category';
  $dbPercentRaw = $t[$percentKey] ?? null;
  $failedRaw = $t[$failedKey] ?? null;
  $enrolledRaw = $t['enrolled_students'] ?? null;

  $dbPercent = is_numeric($dbPercentRaw) ? floatval($dbPercentRaw) : null;
  $failed = is_numeric($failedRaw) ? floatval($failedRaw) : null;
  $enrolled = is_numeric($enrolledRaw) ? floatval($enrolledRaw) : null;

  // If program is filtered (programId set) and recomputed stats exist, use them first
  // This ensures per-period zone aggregation reflects the selected filters.
  if ($programId !== null) {
    $overallPercent = isset($t['failure_percentage']) && is_numeric($t['failure_percentage']) 
      ? floatval($t['failure_percentage']) : null;
    $hasRecomputed = (($enrolled !== null && $enrolled > 0) || ($failed !== null && $failed > 0));
    if ($hasRecomputed && $overallPercent !== null && is_finite($overallPercent)) {
      return zoneFromPercent($overallPercent);
    }
    // If recomputed is present but overallPercent not available, compute from failed/enrolled
    if ($hasRecomputed && $failed !== null && $enrolled !== null && $enrolled > 0) {
      $pct = ($failed / $enrolled) * 100.0;
      return zoneFromPercent($pct);
    }
    // Fall through to existing logic when recomputed stats are not available
  }

  // Prioritize stored period-specific percentage (most accurate for period data)
  if ($dbPercent !== null && is_finite($dbPercent)) {
    return zoneFromPercent($dbPercent);
  }
  // Fallback: calculate from period-specific failed/enrolled if both are available
  if ($failed !== null && $enrolled !== null && $enrolled > 0) {
    $pct = ($failed / $enrolled) * 100.0;
    return zoneFromPercent($pct);
  }
  // Fallback: use overall failure_percentage if period-specific data is missing
  $overallPercent = isset($t['failure_percentage']) && is_numeric($t['failure_percentage']) 
    ? floatval($t['failure_percentage']) : null;
  if ($overallPercent !== null && is_finite($overallPercent)) {
    return zoneFromPercent($overallPercent);
  }
  // Last resort: use category label
  $cat = isset($t[$categoryKey]) ? strval($t[$categoryKey]) : '';
  $zoneFromCat = zoneFromCategoryLabel($cat);
  if ($zoneFromCat !== null) {
    return $zoneFromCat;
  }
  // Final fallback: use overall zone if available
  $overallZone = isset($t['zone']) ? strval($t['zone']) : null;
  if (in_array($overallZone, ['green', 'yellow', 'red'], true)) {
    return $overallZone;
  }
  return null;
}

// Compute zone counts per selected period using period-based fields
$summaryRows = [];
foreach ($selectedPeriods as $p) {
  $green = 0; $yellow = 0; $red = 0;
  $pk = strtolower($p);
  foreach ($teachers as $t) {
    $zone = zoneForTeacherPeriod($t, $pk);
    if ($zone === 'green') { $green++; }
    else if ($zone === 'yellow') { $yellow++; }
    else if ($zone === 'red') { $red++; }
  }
  $summaryRows[] = [
    'period' => $p,
    'total_teachers' => $totalTeachers,
    'green_count' => $green,
    'green_percent' => $totalTeachers > 0 ? round(($green / $totalTeachers) * 100, 2) : 0,
    'yellow_count' => $yellow,
    'yellow_percent' => $totalTeachers > 0 ? round(($yellow / $totalTeachers) * 100, 2) : 0,
    'red_count' => $red,
    'red_percent' => $totalTeachers > 0 ? round(($red / $totalTeachers) * 100, 2) : 0,
  ];
}

// Include SEMESTRAL placeholder for layout parity when period === All
if ($period === 'All') {
  $summaryRows[] = [
    'period' => 'SEMESTRAL',
    'total_teachers' => null,
    'green_count' => null,
    'green_percent' => null,
    'yellow_count' => null,
    'yellow_percent' => null,
    'red_count' => null,
    'red_percent' => null,
  ];
}

// Consistent zone counts: worst-case across periods when All; else mirror single period
$consistent = ['green' => 0, 'yellow' => 0, 'red' => 0];
if ($period === 'All') {
  foreach ($teachers as $t) {
    $zones = [];
    foreach (['p1','p2','p3'] as $pk) {
      $z = zoneForTeacherPeriod($t, $pk);
      if ($z) $zones[] = $z;
    }
    // If no period-specific zones found, try overall zone as fallback
    if (empty($zones)) {
      $overallZone = isset($t['zone']) ? strval($t['zone']) : null;
      if (in_array($overallZone, ['green', 'yellow', 'red'], true)) {
        $zones[] = $overallZone;
      }
    }
    // Count worst-case zone
    if (in_array('red', $zones, true)) { $consistent['red']++; }
    else if (in_array('yellow', $zones, true)) { $consistent['yellow']++; }
    else if (in_array('green', $zones, true)) { $consistent['green']++; }
  }
} else {
  $match = null;
  foreach ($summaryRows as $row) { if ($row['period'] === $period) { $match = $row; break; } }
  if ($match) {
    $consistent['green'] = intval($match['green_count'] ?? 0);
    $consistent['yellow'] = intval($match['yellow_count'] ?? 0);
    $consistent['red'] = intval($match['red_count'] ?? 0);
  }
}

// Department chart: counts per department by period-based zone
$departmentMap = [];
foreach ($teachers as $t) {
  $dept = isset($t['department']) ? strval($t['department']) : 'Unknown';
  if (!isset($departmentMap[$dept])) {
    $departmentMap[$dept] = ['department' => $dept, 'period' => $period, 'green' => 0, 'yellow' => 0, 'red' => 0];
  }
  if ($period === 'All') {
    $zones = [];
    foreach (['p1','p2','p3'] as $pk) {
      $z = zoneForTeacherPeriod($t, $pk);
      if ($z) $zones[] = $z;
    }
    $zFinal = in_array('red', $zones, true) ? 'red' : (in_array('yellow', $zones, true) ? 'yellow' : (in_array('green', $zones, true) ? 'green' : null));
    if ($zFinal) { $departmentMap[$dept][$zFinal]++; }
  } else {
    $pk = strtolower($period);
    $z = zoneForTeacherPeriod($t, $pk);
    if ($z) { $departmentMap[$dept][$z]++; }
  }
}
$departmentChart = array_values($departmentMap);

$response = [
  'filters' => [ 'program' => $program, 'program_id' => $programId, 'school_year' => $school_year, 'semester' => $semester, 'period' => $period ],
  'summary' => $summaryRows,
  'consistent_zone_counts' => $consistent,
  'department_chart' => $departmentChart,
];

if ($debug) {
  // Attach lightweight debug info to help verification
  $samples = [];
  $limit = 5; $i = 0;
  foreach ($teachers as $t) {
    if ($i >= $limit) break;
    $s = $teacherModel->aggregateStatsForTeacher(intval($t['id']), $school_year, $semester, $programId);
    $samples[] = [
      'teacher_id' => $t['teacher_id'] ?? $t['id'],
      'name' => trim(($t['first_name'] ?? '') . ' ' . ($t['last_name'] ?? '')),
      'enrolled' => $s['enrolled_students'],
      'failed' => $s['failed_students'],
      'percent' => $s['failure_percentage'],
      'zone' => $s['zone'],
    ];
    $i++;
  }
  $response['debug'] = [
    'program_id_resolved' => $programId,
    'teachers_evaluated' => $totalTeachers,
    'samples' => $samples,
  ];
}

header('Content-Type: application/json');
echo json_encode($response);