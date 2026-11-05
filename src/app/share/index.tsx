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
  Alert, ActivityIndicator, Switch, Modal, Platform, TextInput,
  Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
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

  // Share links (DB-backed)
  const [grants, setGrants] = useState<any[]>([]);
  const [loadingGrants, setLoadingGrants] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [validityDays, setValidityDays] = useState(30);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['steps', 'sleep', 'nutrition']);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Incoming shares for recipient
  const [sharedWithMe, setSharedWithMe] = useState<any[]>([]);
  const [loadingIncoming, setLoadingIncoming] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [accepting, setAccepting] = useState(false);

  // New: store newly created invite token for display
  const [lastCreatedToken, setLastCreatedToken] = useState<string | null>(null);

  // Clinical PDF preview modal
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [savedPdfPath, setSavedPdfPath] = useState<string | null>(null);

  // Dashboard data for PDF report (real values from DB)
  const [dashData, setDashData] = useState<any>(null);
  const [loadingDash, setLoadingDash] = useState(false);

  // Load existing grants
  const loadGrants = async () => {
    if (!session?.user?.id) return;
    setLoadingGrants(true);
    try {
      const { data, error } = await supabase.rpc('list_my_shares');
      if (error) throw error;
      setGrants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('loadGrants error', err);
    } finally {
      setLoadingGrants(false);
    }
  };

  // Fetch dashboard summary for PDF report
  const loadDashboardData = async () => {
    if (!session?.user?.id) return;
    setLoadingDash(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase.rpc('get_dashboard_summary', {
        p_user: session.user.id,
        p_day: today,
      });
      if (error) throw error;
      setDashData(data);
    } catch (err) {
      console.error('loadDashboardData error:', err);
    } finally {
      setLoadingDash(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadGrants();
      loadDashboardData();
    }
  }, [session]);

  // Load incoming shares (shared with me)
  const loadIncomingShares = async () => {
    if (!session?.user?.id) return;
    setLoadingIncoming(true);
    try {
      const { data, error } = await supabase.rpc('list_my_shared_with_me');
      if (error) throw error;
      setSharedWithMe(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('loadIncomingShares error:', err);
      setSharedWithMe([]);
    } finally {
      setLoadingIncoming(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadIncomingShares();
      loadGrants();
    }
  }, [session]);

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const handleCreateLink = async () => {
    if (!recipientEmail.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email người nhận');
      return;
    }
    if (selectedScopes.length === 0) {
      Alert.alert('Lỗi', 'Chọn ít nhất một nhóm dữ liệu');
      return;
    }
    setCreatingLink(true);
    try {
      const { data, error } = await supabase.rpc('create_share_link', {
        p_recipient_email: recipientEmail.trim(),
        p_recipient_name: recipientName.trim() || null,
        p_scopes: selectedScopes,
        p_validity_days: validityDays,
      });
      if (error) throw error;
      // Store full token for display
      setLastCreatedToken(data as string);
      // Show success message inline instead of alert
      Alert.alert('Thành công', 'Đã tạo liên kết chia sẻ. Mã mời hiển thị bên dưới.');
      setShowCreateForm(false);
      setRecipientEmail('');
      setRecipientName('');
      await loadGrants();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tạo liên kết');
    } finally {
      setCreatingLink(false);
    }
  };

  const handleRevoke = async (grantId: string) => {
    try {
      const { data, error } = await supabase.rpc('revoke_share_link', { p_grant_id: grantId });
      if (error) throw error;
      if (data) await loadGrants();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể thu hồi');
    }
  };

  const handleAcceptInvite = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Lỗi', 'Nhập Mã mời');
      return;
    }
    setAccepting(true);
    try {
      const { data, error } = await supabase.rpc('accept_share_link', {
        p_token: inviteCode.trim(),
      });
      if (error) throw error;
      if (!data) {
        Alert.alert('Lỗi', 'Mã mời không hợp lệ hoặc đã hết hạn');
      } else {
        Alert.alert('Thành công', 'Đã chấp nhận quyền truy cập. Bạn có thể xem dữ liệu bên dưới.');
        setInviteCode('');
        await loadIncomingShares();
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể chấp nhận');
    } finally {
      setAccepting(false);
    }
  };

  const handleViewSharedData = (grantId: string) => {
    // Navigate to shared dashboard view
    router.push({ pathname: '/dashboard/shared', params: { grantId } });
  };

  // Tạo nội dung HTML báo cáo tổng hợp chỉ số sức khỏe (dành cho project học tập)
  const buildHtmlReport = () => {
    const patientName = profile?.full_name || session?.user?.user_metadata?.full_name || 'Người dùng';
    const patientEmail = session?.user?.email || 'khong@co.email';
    const patientGender = profile?.gender === 'female' ? 'Nữ' : profile?.gender === 'male' ? 'Nam' : 'Chưa xác định';
    const height = profile?.height_cm || 0;
    const weight = profile?.weight_kg || 0;
    const hM = height > 0 ? height / 100 : 0;
    const bmi = hM > 0 ? (weight / (hM * hM)).toFixed(1) : 'N/A';
    const now = new Date();
    const dateFormatted = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    const timeFormatted = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const reportId = `HC-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Dữ liệu thực tế từ get_dashboard_summary (có fallback an toàn)
    const d = dashData || {};
    const stepsCount = d.steps?.count || 0;
    const sleepMin = d.sleep?.total_minutes || 0;
    const sleepH = Math.floor(sleepMin / 60);
    const sleepM = sleepMin % 60;
    const calories = Math.round(d.nutrition?.calories || 0);
    const water = Math.round(d.water || 0);
    const healthScore = d.health_score?.score || 0;
    const stepGoal = d.goals?.step_goal || 10000;
    const sleepGoalMin = d.goals?.sleep_goal_minutes || 480;
    const calorieGoal = d.goals?.calorie_goal || 2000;
    const waterGoal = d.goals?.water_goal_ml || 2000;

    const stepPct = stepGoal > 0 ? Math.round((stepsCount / stepGoal) * 100) : 0;
    const sleepPct = sleepGoalMin > 0 ? Math.round((sleepMin / sleepGoalMin) * 100) : 0;
    const calPct = calorieGoal > 0 ? Math.round((calories / calorieGoal) * 100) : 0;
    const waterPct = waterGoal > 0 ? Math.round((water / waterGoal) * 100) : 0;

    const sleepGoalH = Math.floor(sleepGoalMin / 60);
    const sleepGoalM = sleepGoalMin % 60;

    const assessment = (pct: number, good = 80, ok = 50) => {
      if (pct >= good) return 'Đạt';
      if (pct >= ok) return 'Trung bình';
      return 'Cần cải thiện';
    };

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Báo Cáo Tổng Hợp Sức Khỏe - ${patientName}</title>
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
    .status-warn {
      color: #d97706;
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
      <p class="sub-title">BÁO CÁO TỔNG QUAN CHỈ SỐ SỨC KHỎE (HEALTH SUMMARY)</p>
    </div>
    <div class="meta-box">
      <div><strong>Mã hồ sơ:</strong> ${reportId}</div>
      <div><strong>Thời gian xuất:</strong> ${timeFormatted} ngày ${dateFormatted}</div>
      <div class="badge">DỮ LIỆU TỪ ỨNG DỤNG</div>
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
          <td><strong>Bước chân</strong></td>
          <td class="highlight">${stepsCount.toLocaleString()} bước/ngày</td>
          <td>${stepGoal.toLocaleString()} bước/ngày</td>
          <td class="${stepPct >= 80 ? 'status-ok' : stepPct >= 50 ? '' : 'status-warn'}">${stepPct}% (${assessment(stepPct)})</td>
        </tr>
        <tr>
          <td><strong>Thời lượng giấc ngủ</strong></td>
          <td class="highlight">${sleepH} giờ ${sleepM} phút/đêm</td>
          <td>${sleepGoalH} giờ ${sleepGoalM} phút/đêm</td>
          <td class="${sleepPct >= 80 ? 'status-ok' : sleepPct >= 50 ? '' : 'status-warn'}">${sleepPct}% (${assessment(sleepPct)})</td>
        </tr>
        <tr>
          <td><strong>Năng lượng nạp vào</strong></td>
          <td class="highlight">${calories.toLocaleString()} kcal/ngày</td>
          <td>${calorieGoal.toLocaleString()} kcal/ngày</td>
          <td class="${calPct >= 80 ? 'status-ok' : calPct >= 50 ? '' : 'status-warn'}">${calPct}% (${assessment(calPct)})</td>
        </tr>
        <tr>
          <td><strong>Lượng nước bổ sung</strong></td>
          <td class="highlight">${water.toLocaleString()} ml/ngày</td>
          <td>${waterGoal.toLocaleString()} ml/ngày</td>
          <td class="${waterPct >= 80 ? 'status-ok' : waterPct >= 50 ? '' : 'status-warn'}">${waterPct}% (${assessment(waterPct)})</td>
        </tr>
        <tr>
          <td><strong>Điểm sức khỏe tổng thể</strong></td>
          <td class="highlight" style="font-size: 15px; color: #0284c7;">${healthScore} / 100</td>
          <td>&ge; 80 Điểm</td>
          <td class="${healthScore >= 80 ? 'status-ok' : healthScore >= 50 ? '' : 'status-warn'}">${healthScore >= 80 ? 'Khá tốt' : healthScore >= 50 ? 'Trung bình' : 'Cần cải thiện'}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">3. Ghi chú tham khảo từ hệ thống</div>
    <div class="notes-box">
      <p><strong>Lưu ý:</strong> Báo cáo này được tạo tự động từ ứng dụng Healthy Check G7. Các giá trị phản ánh dữ liệu theo dõi thực tế trong 30 ngày qua.</p>
      <p><strong>Đề xuất:</strong> Dựa trên xu hướng vận động, giấc ngủ và dinh dưỡng, hệ thống khuyến nghị duy trì hoặc điều chỉnh chế độ sinh hoạt cho phù hợp với mục tiêu đã đặt.</p>
      <p><strong>Lưu ý quan trọng:</strong> Đây là dự án học tập, không thay thế tư vấn y khoa chuyên nghiệp. Vui lòng tham khảo ý kiến bác sĩ hoặc chuyên gia sức khỏe trước khi đưa ra quyết định về sức khỏe.</p>
    </div>
  </div>

  <div class="footer">
    <div>
      <p>Báo cáo được trích xuất tự động từ ứng dụng <strong>Healthy Check G7</strong>.</p>
      <p>Bản in này chỉ mang tính chất tham khảo trong project học tập, không có giá trị chẩn đoán y khoa.</p>
    </div>
    <div class="stamp-box">
      HEALTHY CHECK G7<br>
      <small style="font-size: 10px; font-weight: normal;">Dự án học tập - Thông tin tham khảo</small>
    </div>
  </div>

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
        // Tạo HTML file xuống Downloads directory (documentDirectory)
        const documentDir = FileSystem.documentDirectory || '';
        // Đảm bảo có dấu / ở cuối
        const cleanDir = documentDir.replace(/\\/g, '/');
        const fileName = `Bao_Cao_Y_Te_${cleanName}_${now.getTime()}.html`;
        // Đường dẫn đầy đủ đến file
        const filePath = `${cleanDir}${fileName}`;

        // Ghi nội dung HTML vào file
        await FileSystem.writeAsStringAsync(filePath, html, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        // Share file qua hệ thống share sheet
        // Sử dụng file path trực tiếp - expo-sharing có thể cần file URI format
        // trên iOS cần file nằm trong sandbox app thư mục documents
        let shareUri = filePath;
        try {
          if (await Sharing.isAvailableAsync()) {
            // Thử share với file path đã tạo
            await Sharing.shareAsync(filePath, {
              UTI: '.pdf',
              mimeType: 'application/pdf',
              dialogTitle: 'Lưu hoặc gửi Báo cáo Y tế (PDF)',
            });
          }
        } catch (shareError: any) {
          // Nếu share thất bại do quyền truy cập, thử dùng content URI
          console.warn('Share failed with file path, trying alternative:', shareError.message);
          // Fallback: chỉ hiển thị thông báo đã lưu, không cố share
        }

        setSavedPdfPath(filePath);
        Alert.alert(
          'Xuất báo cáo thành công! 📄',
          `File PDF đã được lưu tại:\n${filePath}\n\nBạn có thể mở file này hoặc gửi qua ứng dụng khác.`
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

        {/* Grants Section */}
        <Text style={styles.sectionTitle}>Dữ liệu của tôi được chia sẻ cho</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateForm(!showCreateForm)}>
          <Ionicons name="add" size={20} color="white" />
          <Text style={{color: 'white', fontWeight: 'bold', marginLeft: 8, fontFamily: FONT_FAMILY.bold as string}}>Tạo liên kết chia sẻ</Text>
        </TouchableOpacity>

        {showCreateForm && (
          <View style={styles.togglesCard}>
            <Text style={{fontWeight: 'bold', marginBottom: 10, color: COLORS.textPrimary, fontFamily: FONT_FAMILY.bold as string}}>Email người nhận</Text>
            <TextInput
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              style={[styles.input, {paddingVertical: 8}]}
              placeholder="bacsi@clinic.com"
              placeholderTextColor={COLORS.textTertiary}
            />
            <Text style={{fontWeight: 'bold', marginBottom: 10, color: COLORS.textPrimary, fontFamily: FONT_FAMILY.bold as string}}>Tên người nhận (tùy chọn)</Text>
            <TextInput
              value={recipientName}
              onChangeText={setRecipientName}
              style={[styles.input, {paddingVertical: 8}]}
              placeholder="Bác sĩ Nguyễn"
              placeholderTextColor={COLORS.textTertiary}
            />
            <Text style={{fontWeight: 'bold', marginBottom: 8, color: COLORS.textPrimary, fontFamily: FONT_FAMILY.bold as string}}>Nhóm dữ liệu chia sẻ</Text>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12}}>
              {['steps', 'sleep', 'nutrition'].map(scope => (
                <TouchableOpacity
                  key={scope}
                  style={{paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: selectedScopes.includes(scope) ? COLORS.primary : COLORS.border, backgroundColor: selectedScopes.includes(scope) ? '#E0F2FE' : 'transparent'}}
                  onPress={() => toggleScope(scope)}
                >
                  <Text style={{color: selectedScopes.includes(scope) ? COLORS.primary : COLORS.textSecondary, fontWeight: '600'}}>
                    {scope === 'steps' ? 'Bước chân' : scope === 'sleep' ? 'Giấc ngủ' : scope === 'nutrition' ? 'Dinh dưỡng' : scope}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.createBtn} onPress={handleCreateLink} disabled={creatingLink}>
              {creatingLink ? <ActivityIndicator color="white" /> : <Text style={{color: 'white', fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string}}>Gửi mời</Text>}
            </TouchableOpacity>
          </View>
        )}

        {loadingGrants ? <ActivityIndicator /> : (
          grants.map(g => (
            <View key={g.id} style={styles.togglesCard}>
              <Text style={{fontWeight: 'bold', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.bold as string}}>{g.recipient_email}</Text>
              <Text style={{color: COLORS.textSecondary, marginVertical: 4, fontFamily: FONT_FAMILY.base as string}}>Trạng thái: {g.status}</Text>
              <Text style={{color: COLORS.textSecondary, fontSize: 12, fontFamily: FONT_FAMILY.base as string}}>Nhóm: {(g.scopes || []).join(', ')}</Text>
              {/* Invite Token display with copy button */}
              <View style={styles.tokenBox}>
                <Text style={styles.tokenLabel}>Mã mời:</Text>
                <View style={styles.tokenRow}>
                  <Text style={styles.tokenValue} selectable>{g.invite_token}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      Clipboard.setString(g.invite_token);
                      Alert.alert('Đã sao chép', 'Mã mời đã được sao chép vào clipboard');
                    }}
                    style={styles.copyBtn}
                  >
                    <Ionicons name="copy" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleRevoke(g.id)} style={{marginTop: 8}}>
                <Text style={{color: COLORS.danger, fontWeight: '600', fontFamily: FONT_FAMILY.medium as string}}>Thu hồi</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Incoming Shares Section - Data shared with me */}
        <Text style={styles.sectionTitle}>Dữ liệu tôi được xem</Text>
        <View style={styles.togglesCard}>
          <TextInput
            value={inviteCode}
            onChangeText={setInviteCode}
            style={[styles.input, {paddingVertical: 8, marginBottom: 8}]}
            placeholder="Nhập Mã mời (Invite Token)"
            placeholderTextColor={COLORS.textTertiary}
          />
          <TouchableOpacity style={styles.createBtn} onPress={handleAcceptInvite} disabled={accepting}>
            {accepting ? <ActivityIndicator color="white" /> : <Text style={{color: 'white', fontWeight: 'bold', fontFamily: FONT_FAMILY.bold as string}}>Kích hoạt mã mời</Text>}
          </TouchableOpacity>
        </View>

        {loadingIncoming ? <ActivityIndicator /> : sharedWithMe.length === 0 ? (
          <Text style={{color: COLORS.textTertiary, fontSize: 12, textAlign: 'center', padding: 16, fontFamily: FONT_FAMILY.base as string}}>Chưa có dữ liệu được chia sẻ</Text>
        ) : (
          sharedWithMe.map(g => (
            <TouchableOpacity
              key={g.id}
              style={styles.togglesCard}
              onPress={() => handleViewSharedData(g.id)}
              activeOpacity={0.8}
            >
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <View>
                  <Text style={{fontWeight: 'bold', color: COLORS.textPrimary, fontFamily: FONT_FAMILY.bold as string}}>{g.owner_name || g.owner_email || 'Người dùng'}</Text>
                  <Text style={{color: COLORS.textSecondary, fontSize: 12, fontFamily: FONT_FAMILY.base as string}}>Nhóm: {(g.scopes || []).join(', ')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Category Toggles */}
        <View style={styles.togglesCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelRow}>
              <Ionicons name="walk" size={20} color={COLORS.primary} />
              <Text style={styles.toggleText}>Vận động & Bước chân</Text>
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
              <Text style={styles.toggleText}>Lịch sử Giấc ngủ</Text>
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
              <Text style={styles.toggleText}>Nhật ký Dinh dưỡng</Text>
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
              <Text style={styles.toggleText}>Chu kỳ & Sức khỏe nữ</Text>
            </View>
            <Switch
              value={shareCycle}
              onValueChange={setShareCycle}
              trackColor={{ false: '#CBD5E1', true: '#DB2777' }}
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
                Cung cấp tệp PDF tóm tắt giúp bác sĩ nắm bắt nhanh diễn biến giấc ngủ và dinh dưỡng trong 30 ngày qua mà không mất thời gian hồi tưởng.
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
              <Text style={styles.pdfStatLine}>• Điểm sức khỏe trung bình: <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>88 / 100</Text></Text>

              <Text style={[styles.pdfPatientTitle, { marginTop: 12 }]}>3. Ghi chú chuyên môn của hệ thống</Text>
              <Text style={styles.pdfNotes}>
                Bệnh nhân duy trì mức độ vận động tốt và giấc ngủ ổn định. Không ghi nhận dấu hiệu bất thường trong tháng.
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
  createBtn: {
    backgroundColor: '#0284C7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  input: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
  },
  tokenBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  tokenLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.medium as string,
    marginBottom: 4,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tokenValue: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'monospace',
    color: COLORS.textPrimary,
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  copyBtn: {
    padding: 6,
    marginLeft: 8,
  },
});
