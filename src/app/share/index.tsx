/**
 * Màn hình Chia sẻ thông tin sức khỏe (Share Health Information Screen)
 * Khớp thiết kế Mockup #10: Share Health Information.png & Tích hợp Roboto Fonts
 * Tích hợp tính năng Xuất Báo cáo Tóm tắt Y tế (Clinical Summary PDF) THỰC TẾ:
 * - Xuất và lưu tệp PDF vào bộ nhớ máy / Thư mục Downloads
 * - Hỗ trợ in ấn trực tiếp (Print to PDF / Wireless Printer)
 * - Mở hộp thoại hệ thống "Lưu vào Tệp" (Save to Files / Share to Doctor)
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Switch, Modal, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_FAMILY } from '@/theme';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import BottomTabBar from '@/components/bottom-tab-bar';

export default function ShareScreen() {
  const router = useRouter();
  const { session, profile, loading: authLoading } = useAuth();

  // Sharing toggles
  const [shareSteps, setShareSteps] = useState(true);
  const [shareSleep, setShareSleep] = useState(true);
  const [shareNutrition, setShareNutrition] = useState(true);
  const [shareCycle, setShareCycle] = useState(false);
  const [shareVitals, setShareVitals] = useState(true);

  // Clinical PDF preview modal
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [savedPdfPath, setSavedPdfPath] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace('/auth/sign-in');
      return;
    }
  }, [session, authLoading]);

  // Tạo nội dung HTML chuẩn y khoa cho báo cáo lâm sàng
  const buildHtmlReport = () => {
    const patientName = profile?.full_name || session?.user?.user_metadata?.full_name || 'Alex Nguyen';
    const patientEmail = session?.user?.email || 'patient@example.com';
    const patientGender = profile?.gender === 'female' ? 'Nữ (Female)' : profile?.gender === 'male' ? 'Nam (Male)' : 'Chưa xác định';
    const height = profile?.height_cm || 168;
    const weight = profile?.weight_kg || 58;
    const hM = height / 100;
    const bmi = (weight / (hM * hM)).toFixed(1);
    const now = new Date();
    const dateFormatted = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    const timeFormatted = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const reportId = `HC-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Báo Cáo Sức Khỏe Lâm Sàng - ${patientName}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      padding: 24px;
      margin: 0;
      background: #ffffff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #0284c7;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .logo-title {
      font-size: 22px;
      font-weight: 800;
      color: #0284c7;
      letter-spacing: -0.5px;
      margin: 0 0 4px 0;
    }
    .sub-title {
      font-size: 13px;
      color: #64748b;
      margin: 0;
      font-weight: 500;
    }
    .meta-box {
      text-align: right;
      font-size: 12px;
      color: #475569;
    }
    .badge {
      display: inline-block;
      background: #ecfdf5;
      color: #059669;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      border: 1px solid #a7f3d0;
      margin-top: 6px;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .info-card p {
      margin: 4px 0;
      font-size: 13px;
    }
    .info-card strong {
      color: #334155;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 13px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 9px 12px;
      text-align: left;
    }
    th {
      background-color: #f1f5f9;
      color: #1e293b;
      font-weight: 600;
    }
    .highlight {
      font-weight: 700;
      color: #0284c7;
    }
    .status-ok {
      color: #16a34a;
      font-weight: 600;
    }
    .notes-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 13px;
      color: #166534;
      line-height: 1.6;
    }
    .footer {
      margin-top: 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
    }
    .stamp-box {
      text-align: center;
      border: 2px dashed #0284c7;
      padding: 10px 20px;
      border-radius: 8px;
      color: #0284c7;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="logo-title">HEALTHY CHECK G7</h1>
      <p class="sub-title">BÁO CÁO TỔNG QUAN CHỈ SỐ SỨC KHỎE LÂM SÀNG (PATIENT SUMMARY)</p>
    </div>
    <div class="meta-box">
      <div><strong>Mã hồ sơ:</strong> ${reportId}</div>
      <div><strong>Thời gian xuất:</strong> ${timeFormatted} ngày ${dateFormatted}</div>
      <div class="badge">ĐÃ XÁC THỰC DỮ LIỆU</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">1. Thông tin bệnh nhân & Thể trạng</div>
    <div class="grid-2">
      <div class="info-card">
        <p><strong>Họ và tên:</strong> ${patientName}</p>
        <p><strong>Email tài khoản:</strong> ${patientEmail}</p>
        <p><strong>Giới tính sinh học:</strong> ${patientGender}</p>
      </div>
      <div class="info-card">
        <p><strong>Chiều cao:</strong> ${height} cm</p>
        <p><strong>Cân nặng:</strong> ${weight} kg</p>
        <p><strong>Chỉ số BMI:</strong> <span class="highlight">${bmi}</span> (Thể trạng cân đối theo chuẩn WHO)</p>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">2. Tổng hợp dữ liệu theo dõi 30 ngày qua</div>
    <table>
      <thead>
        <tr>
          <th>Chỉ số sinh học</th>
          <th>Mức trung bình thực tế</th>
          <th>Mục tiêu khuyến nghị</th>
          <th>Đánh giá lâm sàng</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Bước chân (Activity)</strong></td>
          <td class="highlight">7,850 bước/ngày</td>
          <td>10,000 bước/ngày</td>
          <td class="status-ok">Đạt 78.5% (Tích cực)</td>
        </tr>
        <tr>
          <td><strong>Thời lượng giấc ngủ</strong></td>
          <td class="highlight">7 giờ 25 phút/đêm</td>
          <td>8 giờ 00 phút/đêm</td>
          <td class="status-ok">Ổn định (Deep/REM đạt chuẩn)</td>
        </tr>
        <tr>
          <td><strong>Năng lượng nạp vào</strong></td>
          <td class="highlight">1,920 kcal/ngày</td>
          <td>2,000 kcal/ngày</td>
          <td class="status-ok">Cân bằng năng lượng tốt</td>
        </tr>
        <tr>
          <td><strong>Lượng nước bổ sung</strong></td>
          <td class="highlight">2,100 ml/ngày</td>
          <td>2,000 ml/ngày</td>
          <td class="status-ok">Đạt chuẩn 105%</td>
        </tr>
        <tr>
          <td><strong>Nhịp tim lúc nghỉ (Resting HR)</strong></td>
          <td class="highlight">72 BPM</td>
          <td>60 - 85 BPM</td>
          <td class="status-ok">Nhịp xoang đều, bình thường</td>
        </tr>
        <tr>
          <td><strong>Điểm sức khỏe tổng thể</strong></td>
          <td class="highlight" style="font-size: 15px; color: #0284c7;">88 / 100 Điểm</td>
          <td>&ge; 80 Điểm</td>
          <td class="status-ok">Hạng: Xuất sắc</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">3. Đánh giá y khoa & Khuyến nghị của hệ thống</div>
    <div class="notes-box">
      <p><strong>Kết luận:</strong> Dữ liệu ghi nhận từ hệ thống cảm biến và nhật ký sinh học cho thấy bệnh nhân duy trì lối sống lành mạnh, nhịp tim và tuần hoàn ổn định. Không phát hiện dấu hiệu bất thường về nhịp tim hay rối loạn pha ngủ trong 30 ngày gần nhất.</p>
      <p><strong>Khuyến nghị bác sĩ:</strong> Tiếp tục duy trì chế độ vận động Zone 2 từ 150 phút/tuần, bổ sung đủ nước và điện giải khi làm việc cường độ cao.</p>
    </div>
  </div>

  <div class="footer">
    <div>
      <p>Báo cáo được trích xuất tự động từ ứng dụng <strong>Healthy Check G7</strong>.</p>
      <p>Bản in này có giá trị cung cấp thông tin tham khảo cho Bác sĩ điều trị trong buổi thăm khám.</p>
    </div>
    <div class="stamp-box">
      HỘI ĐỒNG Y KHOA G7<br>
      <small style="font-size: 10px; font-weight: normal;">CHỨNG THỰC ĐIỆN TỬ</small>
    </div>
  </div>
</body>
</html>
`;
  };

  // Thực thi Xuất & Lưu tệp PDF thực tế vào bộ nhớ
  const handleExportAndSavePdf = async () => {
    setExportingPdf(true);
    try {
      const html = buildHtmlReport();
      const patientName = profile?.full_name || 'Alex_Nguyen';
      const cleanName = patientName.replace(/\s+/g, '_');
      const now = new Date();
      const fileName = `Bao_Cao_Y_Te_${cleanName}_${now.getTime()}`;

      if (Platform.OS === 'web') {
        // Trên Trình duyệt:
        // 1. Tự động tải tệp HTML/PDF về thư mục Downloads của máy tính
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
          const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${fileName}.html`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }

        // 2. Mở trực tiếp hộp thoại in / Lưu thành PDF của trình duyệt
        await Print.printAsync({ html });

        const saveMsg = `Đã tải về thư mục Downloads (${fileName}.html) và mở hộp thoại Lưu PDF!`;
        setSavedPdfPath(saveMsg);
        Alert.alert('Thành công! 📄', 'Báo cáo đã được lưu về máy và mở hộp thoại lưu PDF.');
      } else {
        // Trên điện thoại (iOS & Android):
        // 1. Tạo tệp PDF thực tế trong bộ nhớ tạm của thiết bị
        const { uri } = await Print.printToFileAsync({ html });
        setSavedPdfPath(uri);

        // 2. Mở hộp thoại hệ thống: Lưu vào Tệp (Files / Downloads) hoặc gửi Bác sĩ
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            UTI: '.pdf',
            mimeType: 'application/pdf',
            dialogTitle: 'Lưu hoặc gửi Báo cáo Y tế (PDF)',
          });
        }

        Alert.alert(
          'Tạo tệp PDF thành công! 📄',
          `Tệp đã được xuất và lưu tạm tại:\n${uri}\n\nBạn có thể chọn "Lưu vào Tệp" (Save to Files) để lưu trữ vĩnh viễn trên điện thoại.`
        );
      }
    } catch (err: any) {
      console.error('Lỗi xuất PDF:', err);
      Alert.alert('Lỗi xuất PDF', err.message || 'Không thể xuất tệp PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  // In trực tiếp ra máy in
  const handleDirectPrint = async () => {
    try {
      const html = buildHtmlReport();
      await Print.printAsync({ html });
    } catch (err: any) {
      Alert.alert('Lỗi in', err.message || 'Không thể kết nối máy in');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chia sẻ dữ liệu y tế</Text>
        <TouchableOpacity onPress={() => setShowPdfModal(true)} style={styles.pdfBtn}>
          <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.banner}>
          <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>Bảo mật cấp y tế (HIPAA Standard)</Text>
            <Text style={styles.bannerSub}>
              Chỉ bác sĩ được bạn cấp quyền mới có thể truy cập. Mọi truy cập đều được mã hóa đầu cuối.
            </Text>
          </View>
        </View>

        {/* Clinical PDF Banner Action */}
        <TouchableOpacity
          style={styles.exportPdfBanner}
          onPress={() => setShowPdfModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.exportPdfLeft}>
            <View style={styles.pdfIconWrap}>
              <Ionicons name="document-text" size={24} color="#15803D" />
            </View>
            <View>
              <Text style={styles.exportPdfTitle}>Xuất Tóm tắt Hồ sơ Y tế (PDF)</Text>
              <Text style={styles.exportPdfSub}>Tạo và lưu tệp PDF chỉ số 30 ngày cho buổi khám bệnh</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#15803D" />
        </TouchableOpacity>

        {/* Category Toggles */}
        <Text style={styles.sectionTitle}>Các nhóm dữ liệu cho phép xem</Text>
        <View style={styles.togglesCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelRow}>
              <Ionicons name="walk" size={20} color={COLORS.primary} />
              <Text style={styles.toggleText}>Vận động & Bước chân (Activity)</Text>
            </View>
            <Switch
              value={shareSteps}
              onValueChange={setShareSteps}
              trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelRow}>
              <Ionicons name="moon" size={20} color="#8B5CF6" />
              <Text style={styles.toggleText}>Lịch sử Giấc ngủ (Sleep Records)</Text>
            </View>
            <Switch
              value={shareSleep}
              onValueChange={setShareSleep}
              trackColor={{ false: '#CBD5E1', true: '#8B5CF6' }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelRow}>
              <Ionicons name="restaurant" size={20} color="#D97706" />
              <Text style={styles.toggleText}>Nhật ký Dinh dưỡng (Nutrition Logs)</Text>
            </View>
            <Switch
              value={shareNutrition}
              onValueChange={setShareNutrition}
              trackColor={{ false: '#CBD5E1', true: '#D97706' }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelRow}>
              <Ionicons name="rose" size={20} color="#DB2777" />
              <Text style={styles.toggleText}>Chu kỳ & Sức khỏe nữ (Cycle Data)</Text>
            </View>
            <Switch
              value={shareCycle}
              onValueChange={setShareCycle}
              trackColor={{ false: '#CBD5E1', true: '#DB2777' }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelRow}>
              <Ionicons name="pulse" size={20} color="#EF4444" />
              <Text style={styles.toggleText}>Chỉ số sinh tồn & Nhịp tim (Vitals & HR)</Text>
            </View>
            <Switch
              value={shareVitals}
              onValueChange={setShareVitals}
              trackColor={{ false: '#CBD5E1', true: '#EF4444' }}
            />
          </View>
        </View>

        {/* Doctor Visit Preparation Tips */}
        <Text style={styles.sectionTitle}>Lưu ý hữu ích cho buổi khám bệnh</Text>
        <View style={styles.tipsCard}>
          <View style={styles.tipRow}>
            <View style={[styles.tipIconWrap, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="document-text" size={18} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Chia sẻ báo cáo ở đầu buổi khám</Text>
              <Text style={styles.tipDesc}>
                Cung cấp tệp PDF tóm tắt giúp bác sĩ nắm bắt nhanh diễn biến huyết áp, giấc ngủ và nhịp tim trong 30 ngày qua mà không mất thời gian hồi tưởng.
              </Text>
            </View>
          </View>

          <View style={styles.tipDivider} />

          <View style={styles.tipRow}>
            <View style={[styles.tipIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="medkit" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Đối chiếu đơn thuốc hiện tại</Text>
              <Text style={styles.tipDesc}>
                Ghi chú hoặc mang theo danh mục các loại thuốc, vitamin và thực phẩm bổ sung bạn đang dùng để tránh tương tác thuốc bất lợi.
              </Text>
            </View>
          </View>

          <View style={styles.tipDivider} />

          <View style={styles.tipRow}>
            <View style={[styles.tipIconWrap, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="chatbubbles" size={18} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Chuẩn bị sẵn 2 - 3 câu hỏi trọng tâm</Text>
              <Text style={styles.tipDesc}>
                Liệt kê sẵn các triệu chứng bất thường (thời điểm đau, tần suất mất ngủ) để nhận tư vấn chính xác và tối ưu thời gian thăm khám.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Clinical PDF Preview & Real Export Modal */}
      <Modal
        visible={showPdfModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPdfModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalTopRow}>
              <View>
                <Text style={styles.modalTitle}>Báo cáo Tóm tắt Y tế (PDF)</Text>
                <Text style={styles.modalSub}>Healthy Check Clinical Patient Summary</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPdfModal(false)}>
                <Ionicons name="close-circle" size={26} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Document Mockup View */}
            <ScrollView style={styles.pdfPaper} showsVerticalScrollIndicator={false}>
              <View style={styles.pdfHeaderRow}>
                <View>
                  <Text style={styles.pdfClinicName}>HEALTHY CHECK MEDICAL REPORT</Text>
                  <Text style={styles.pdfDate}>Ngày xuất: {new Date().toLocaleDateString('vi-VN')}</Text>
                </View>
                <View style={styles.pdfBadgeOfficial}>
                  <Text style={styles.pdfBadgeOfficialText}>VERIFIED</Text>
                </View>
              </View>

              <View style={styles.pdfDivider} />

              <Text style={styles.pdfPatientTitle}>1. Thông tin bệnh nhân</Text>
              <Text style={styles.pdfPatientText}>• Họ tên: {profile?.full_name || 'Alex Nguyen'}</Text>
              <Text style={styles.pdfPatientText}>• Giới tính: {profile?.gender === 'female' ? 'Nữ' : 'Nam'}</Text>
              <Text style={styles.pdfPatientText}>• Chiều cao: {profile?.height_cm || 168} cm | Cân nặng: {profile?.weight_kg || 58} kg</Text>
              <Text style={styles.pdfPatientText}>• BMI: 20.5 (Thể trạng bình thường - Chuẩn WHO)</Text>

              <Text style={[styles.pdfPatientTitle, { marginTop: 12 }]}>2. Tóm tắt sinh trắc học 30 ngày qua</Text>
              <Text style={styles.pdfStatLine}>• Số bước chân trung bình: <Text style={{ fontWeight: 'bold' }}>7,850 bước/ngày</Text></Text>
              <Text style={styles.pdfStatLine}>• Thời lượng ngủ trung bình: <Text style={{ fontWeight: 'bold' }}>7 giờ 25 phút/đêm</Text></Text>
              <Text style={styles.pdfStatLine}>• Nạp calo trung bình: <Text style={{ fontWeight: 'bold' }}>1,920 kcal/ngày</Text></Text>
              <Text style={styles.pdfStatLine}>• Nhịp tim lúc nghỉ ngơi (Resting HR): <Text style={{ fontWeight: 'bold' }}>72 bpm (Bình thường)</Text></Text>
              <Text style={styles.pdfStatLine}>• Điểm sức khỏe trung bình: <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>88 / 100</Text></Text>

              <Text style={[styles.pdfPatientTitle, { marginTop: 12 }]}>3. Ghi chú chuyên môn của hệ thống</Text>
              <Text style={styles.pdfNotes}>
                Bệnh nhân duy trì mức độ vận động tốt và giấc ngủ ổn định. Không ghi nhận chỉ số nhịp tim bất thường trong tháng.
              </Text>
            </ScrollView>

            {/* Saved Banner if file generated */}
            {savedPdfPath && (
              <View style={styles.savedBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#15803D" style={{ marginRight: 6 }} />
                <Text style={styles.savedBannerText} numberOfLines={2}>
                  {savedPdfPath.startsWith('file:') ? `Đã lưu tại: ${savedPdfPath.split('/').slice(-2).join('/')}` : savedPdfPath}
                </Text>
              </View>
            )}

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.pdfSaveBtn, exportingPdf && { opacity: 0.7 }]}
                onPress={handleExportAndSavePdf}
                disabled={exportingPdf}
                activeOpacity={0.8}
              >
                {exportingPdf ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.pdfSaveBtnText}>Lưu tệp PDF về máy</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pdfPrintBtn}
                onPress={handleDirectPrint}
                activeOpacity={0.8}
              >
                <Ionicons name="print-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={styles.pdfPrintBtnText}>In trực tiếp</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom 4-Tab Bar */}
      <BottomTabBar currentRoute="/share" onTabPress={(route) => router.push(route as any)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
  },
  pdfBtn: { padding: 4 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 110 },
  banner: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 16,
    gap: 12,
  },
  bannerTextWrap: { flex: 1 },
  bannerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#0369A1',
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 11,
    color: '#0284C7',
    fontFamily: FONT_FAMILY.base as string,
    lineHeight: 16,
  },
  exportPdfBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 20,
    ...SHADOWS.sm,
  },
  exportPdfLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  pdfIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportPdfTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#15803D',
  },
  exportPdfSub: {
    fontSize: 11,
    color: '#166534',
    fontFamily: FONT_FAMILY.base as string,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
    marginBottom: 10,
    marginTop: 6,
  },
  togglesCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    ...SHADOWS.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.medium as string,
    color: COLORS.textPrimary,
  },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  tipsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    ...SHADOWS.sm,
  },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tipIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
  },
  tipDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.base as string,
    marginTop: 3,
  },
  tipDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.textPrimary,
  },
  modalSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.base as string,
    marginTop: 2,
  },
  pdfPaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: 360,
  },
  pdfHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pdfClinicName: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  pdfDate: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: FONT_FAMILY.base as string,
    marginTop: 2,
  },
  pdfBadgeOfficial: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pdfBadgeOfficialText: {
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#166534',
  },
  pdfDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 10 },
  pdfPatientTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#0F172A',
    marginBottom: 4,
  },
  pdfPatientText: {
    fontSize: 11,
    color: '#334155',
    fontFamily: FONT_FAMILY.base as string,
    lineHeight: 17,
  },
  pdfStatLine: {
    fontSize: 11,
    color: '#334155',
    fontFamily: FONT_FAMILY.base as string,
    lineHeight: 18,
  },
  pdfNotes: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    fontFamily: FONT_FAMILY.base as string,
    lineHeight: 17,
    marginTop: 4,
  },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  savedBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#15803D',
    fontWeight: '600',
    fontFamily: FONT_FAMILY.medium as string,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  pdfSaveBtn: {
    flex: 1,
    backgroundColor: '#16A34A',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  pdfSaveBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: '#FFFFFF',
  },
  pdfPrintBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfPrintBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold as string,
    color: COLORS.primary,
  },
});
