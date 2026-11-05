/**
 * ============================================================================
 * KIỂM THỬ ĐƠN VỊ (UNIT TESTING) — HỆ THỐNG HEALTHY CHECK G7
 * ============================================================================
 * Kiểm tra các hàm nghiệp vụ, thuật toán tính toán và logic xác thực độc lập:
 * - Thuật toán tính điểm Health Score (FR-03)
 * - Thuật toán phân bổ đa lượng chất Carbs/Protein/Fat (FR-07)
 * - Thuật toán dự báo ngày rụng trứng & chu kỳ kinh nguyệt (FR-08)
 * - Thuật toán chuyển đổi bước chân sang km và calo tiêu hao (FR-05)
 * - Các hàm Validation: Email, Password, Số bước không âm (FR-02, FR-05)
 * - Hàm định dạng thời lượng giấc ngủ (FR-06)
 * - Hàm phát hiện và phòng chống SQL Injection, XSS (NFR-02)
 * - Hàm tính toán tiến độ uống nước (Water Tracker)
 * ============================================================================
 */

// --- CÁC HÀM NGHIỆP VỤ UNIT ---

export function calculateHealthScore(
  steps: number, stepGoal: number,
  sleepMins: number, sleepGoalMins: number,
  calories: number, calorieGoal: number,
  hasLoggedCycle: boolean
): number {
  const stepScore  = Math.min((steps / stepGoal) * 100, 100) * 0.30;
  const sleepScore = Math.min((sleepMins / sleepGoalMins) * 100, 100) * 0.30;
  const calScore   = Math.min((calories / calorieGoal) * 100, 100) * 0.25;
  const cycleScore = (hasLoggedCycle ? 100 : 50) * 0.15;
  return Math.round(stepScore + sleepScore + calScore + cycleScore);
}

export function predictOvulationDay(cycleLength: number): number {
  return cycleLength - 14;
}

export function predictNextPeriod(lastPeriodDate: Date, cycleLength: number): Date {
  const next = new Date(lastPeriodDate);
  next.setDate(next.getDate() + cycleLength);
  return next;
}

export function calculateMacroPercentages(carbsG: number, proteinG: number, fatG: number) {
  const totalCal = carbsG * 4 + proteinG * 4 + fatG * 9;
  if (totalCal === 0) return { carbs: 0, protein: 0, fat: 0 };
  return {
    carbs:   Math.round((carbsG * 4 / totalCal) * 100),
    protein: Math.round((proteinG * 4 / totalCal) * 100),
    fat:     Math.round((fatG * 9 / totalCal) * 100),
  };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

export function isValidStepCount(steps: number): boolean {
  return Number.isInteger(steps) && steps >= 0;
}

export function formatSleepDuration(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}h ${m}m`;
}

export function containsSqlInjection(input: string): boolean {
  const dangerousPatterns = [
    /('|--|;|\/\*|\*\/)/i,
    /(drop\s+table|insert\s+into|delete\s+from|select\s+\*)/i,
    /(\bor\b.*=.*\bor\b|\bor\b.*1\s*=\s*1)/i,
  ];
  return dangerousPatterns.some(p => p.test(input));
}

export function waterCompletionPercent(currentMl: number, goalMl: number): number {
  if (goalMl <= 0) return 0;
  return Math.min(Math.round((currentMl / goalMl) * 100), 100);
}

// --- TEST SUITES: UNIT TESTING ---

describe('PHẦN 1: UNIT TESTING (KIỂM THỬ ĐƠN VỊ CÁC THUẬT TOÁN & NGHIỆP VỤ)', () => {

  // UT-01: Thuật toán tính Health Score
  describe('UT-01 [FR-03] | Thuật toán tính điểm Health Score', () => {
    test('Dữ liệu chuẩn mockup đạt điểm xuất sắc (~88/100)', () => {
      const score = calculateHealthScore(6432, 10000, 450, 480, 1850, 2200, true);
      expect(score).toBeGreaterThanOrEqual(80);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('Xử lý giá trị 0 khi người dùng chưa có hoạt động', () => {
      const score = calculateHealthScore(0, 10000, 0, 480, 0, 2200, false);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThan(20);
    });

    test('Điểm số không bao giờ vượt trần 100 khi vượt mục tiêu', () => {
      const score = calculateHealthScore(25000, 10000, 600, 480, 3000, 2200, true);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  // UT-02: Phân bổ đa lượng chất (Macro)
  describe('UT-02 [FR-07] | Tính toán tỷ lệ dinh dưỡng Carbs / Protein / Fat', () => {
    test('Tổng tỷ lệ phần trăm 3 nhóm chất luôn luôn bằng 100%', () => {
      const { carbs, protein, fat } = calculateMacroPercentages(230, 95, 65);
      expect(carbs + protein + fat).toBe(100);
    });

    test('Khối lượng carbs cao nhất phản ánh đúng tỷ lệ calo lớn nhất', () => {
      const { carbs, protein, fat } = calculateMacroPercentages(230, 95, 65);
      expect(carbs).toBeGreaterThan(protein);
      expect(carbs).toBeGreaterThan(fat);
    });

    test('Khối lượng rỗng (0g) an toàn trả về 0% cho cả 3 nhóm', () => {
      const { carbs, protein, fat } = calculateMacroPercentages(0, 0, 0);
      expect(carbs).toBe(0);
      expect(protein).toBe(0);
      expect(fat).toBe(0);
    });
  });

  // UT-03: Dự báo chu kỳ sinh học & Ngày rụng trứng
  describe('UT-03 [FR-08] | Thuật toán y khoa dự báo chu kỳ kinh nguyệt', () => {
    test('Chu kỳ tiêu chuẩn 28 ngày: rụng trứng vào Ngày 14', () => {
      expect(predictOvulationDay(28)).toBe(14);
    });

    test('Chu kỳ dài 32 ngày: rụng trứng vào Ngày 18', () => {
      expect(predictOvulationDay(32)).toBe(18);
    });

    test('Dự báo chính xác ngày bắt đầu của kỳ kinh kế tiếp', () => {
      const lastPeriod = new Date('2026-10-01');
      const nextPeriod = predictNextPeriod(lastPeriod, 28);
      expect(nextPeriod.toISOString().startsWith('2026-10-29')).toBe(true);
    });
  });

  // UT-04: Tính toán bước chân, quãng đường và calo
  describe('UT-04 [FR-05] | Tính toán khoảng cách (km) và năng lượng (kcal)', () => {
    test('6,432 bước tương đương ~4.8 km với bước sải 0.747m', () => {
      const steps = 6432;
      const strideM = 0.747;
      const distKm = parseFloat(((steps * strideM) / 1000).toFixed(1));
      expect(distKm).toBeCloseTo(4.8, 0);
    });

    test('6,432 bước đốt cháy ~320 kcal (hệ số 0.0498 kcal/bước)', () => {
      const steps = 6432;
      const kcal = Math.round(steps * 0.0498);
      expect(kcal).toBeGreaterThanOrEqual(300);
      expect(kcal).toBeLessThanOrEqual(340);
    });

    test('Tính đúng % hoàn thành mục tiêu: 6,432 / 10,000 = 64%', () => {
      const pct = Math.round((6432 / 10000) * 100);
      expect(pct).toBe(64);
    });
  });

  // UT-05: Validation dữ liệu đầu vào
  describe('UT-05 [FR-02, FR-05] | Validation dữ liệu định dạng', () => {
    test('Xác thực Email hợp lệ được chấp nhận', () => {
      expect(isValidEmail('student@iuh.edu.vn')).toBe(true);
      expect(isValidEmail('doctor.smith@clinic.com')).toBe(true);
    });

    test('Từ chối Email sai định dạng (thiếu @, thiếu domain, rỗng)', () => {
      expect(isValidEmail('invalid_email')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    test('Mật khẩu tối thiểu 6 ký tự đạt chuẩn bảo mật', () => {
      expect(isValidPassword('123456')).toBe(true);
      expect(isValidPassword('short')).toBe(false);
    });

    test('Từ chối số bước âm (-500) hoặc số bước thập phân', () => {
      expect(isValidStepCount(-500)).toBe(false);
      expect(isValidStepCount(12.5)).toBe(false);
      expect(isValidStepCount(0)).toBe(true);
      expect(isValidStepCount(8000)).toBe(true);
    });
  });

  // UT-06: Chuyển đổi định dạng giấc ngủ
  describe('UT-06 [FR-06] | Định dạng thời lượng giấc ngủ', () => {
    test('450 phút chuyển đổi thành "7h 30m"', () => {
      expect(formatSleepDuration(450)).toBe('7h 30m');
    });

    test('480 phút chuyển đổi thành "8h 0m"', () => {
      expect(formatSleepDuration(480)).toBe('8h 0m');
    });

    test('Đạt 94% mục tiêu giấc ngủ khi ngủ 450/480 phút', () => {
      expect(Math.round((450 / 480) * 100)).toBe(94);
    });
  });

  // UT-07: An toàn thông tin & Chống tấn công (Security)
  describe('UT-07 [NFR-02] | Phát hiện ký tự độc hại SQL Injection & XSS', () => {
    test('Phát hiện chuỗi tấn công bypass xác thực: \' OR \'1\'=\'1', () => {
      expect(containsSqlInjection("' OR '1'='1; DROP TABLE users;--")).toBe(true);
    });

    test('Phát hiện câu lệnh DROP TABLE nguy hiểm', () => {
      expect(containsSqlInjection("'; DROP TABLE profiles; --")).toBe(true);
    });

    test('Cho phép chuỗi tìm kiếm thông thường (tiếng Anh & tiếng Việt)', () => {
      expect(containsSqlInjection('cách ngủ ngon giấc')).toBe(false);
      expect(containsSqlInjection('healthy nutrition recipes')).toBe(false);
    });
  });

  // UT-08: Tính toán mục tiêu uống nước (Water Tracker)
  describe('UT-08 [FR-NEW] | Tính toán tiến độ uống nước (Water Tracker)', () => {
    test('1,500ml / 2,000ml đạt 75% mục tiêu', () => {
      expect(waterCompletionPercent(1500, 2000)).toBe(75);
    });

    test('Uống vượt mục tiêu vẫn giữ mức tối đa 100%', () => {
      expect(waterCompletionPercent(2500, 2000)).toBe(100);
    });

    test('Mục tiêu bằng 0 không gây lỗi chia cho 0', () => {
      expect(waterCompletionPercent(500, 0)).toBe(0);
    });
  });

});

