/**
 * Định nghĩa tool truy cập dữ liệu sức khỏe (plan §5.4).
 *
 * Bảo mật (bất biến — plan §2):
 *  - Mọi tool chạy bằng CLIENT A: Supabase client mang JWT của người đang chat,
 *    nên RLS áp dụng đúng chủ nhân dữ liệu. Không bao giờ dùng service role ở đây.
 *  - Không tool nào nhận user_id từ model; RPC mặc định p_user = auth.uid().
 *  - Kết quả mỗi tool cắt tối đa ~6000 ký tự JSON.
 *
 * cycle schema: migration 0008 đã thay cycle_records bằng
 * cycle_periods + cycle_daily_logs — get_cycle_summary đọc hai bảng này.
 */

// Deno/Edge Function: dùng npm: specifier (Supabase docs khuyến nghị cho EF).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { ToolDef } from './llm/provider.ts';

const MAX_TOOL_RESULT = 6000;

function truncate(result: string): string {
  if (result.length <= MAX_TOOL_RESULT) return result;
  return result.slice(0, MAX_TOOL_RESULT) + '... (ket qua da bi cat)';
}

/**
 * Build danh sách tool cho một request cụ thể.
 * `user` là client A (JWT của người dùng đang chat).
 * `cycleEnabled` quyết định có đăng ký get_cycle_summary hay không (§5.4).
 */
export function buildTools(user: SupabaseClient, cycleEnabled: boolean): ToolDef[] {
  const tools: ToolDef[] = [
    // -------------------------------------------------------------------------
    // get_today_summary — rpc get_dashboard_summary, KHÔNG truyền p_user
    // -------------------------------------------------------------------------
    {
      schema: {
        name: 'get_today_summary',
        description:
          'Lấy tổng quan sức khỏe một ngày của chính người dùng: điểm Health Score, bước chân, giấc ngủ, dinh dưỡng, nước, chu kỳ, báo cáo tuần. Thiếu dữ liệu nào thì trường đó trả 0/null.',
        parameters: {
          type: 'object',
          properties: {
            day: {
              type: 'string',
              description: 'Ngày dạng YYYY-MM-DD. Mặc định là hôm nay.',
            },
          },
        },
      },
      execute: async (args) => {
        const day = typeof args.day === 'string' && args.day ? args.day : undefined;
        const { data, error } = day
          ? await user.rpc('get_dashboard_summary', { p_day: day })
          : await user.rpc('get_dashboard_summary');
        if (error) throw new Error(`get_today_summary: ${error.message}`);
        return truncate(JSON.stringify(data ?? null));
      },
    },

    // -------------------------------------------------------------------------
    // get_metric_series — rpc get_metric_series, KHÔNG truyền p_user
    // -------------------------------------------------------------------------
    {
      schema: {
        name: 'get_metric_series',
        description:
          'Lấy chuỗi dữ liệu theo thời gian cho một chỉ số: steps (bước), sleep (phút ngủ), calories (calo tiêu thụ), water (ml nước). Trả về mảng {bucket, value} theo ngày.',
        parameters: {
          type: 'object',
          properties: {
            kind: {
              type: 'string',
              enum: ['steps', 'sleep', 'calories', 'water'],
              description: 'Chỉ số cần lấy.',
            },
            range: {
              type: 'string',
              enum: ['today', 'weekly', 'monthly'],
              description: 'Khoảng thời gian: hôm nay / 7 ngày / 30 ngày gần nhất.',
            },
          },
          required: ['kind', 'range'],
        },
      },
      execute: async (args) => {
        const kind = String(args.kind ?? 'steps');
        const range = String(args.range ?? 'weekly');
        const { data, error } = await user.rpc('get_metric_series', {
          p_kind: kind,
          p_range: range,
        });
        if (error) throw new Error(`get_metric_series: ${error.message}`);
        return truncate(JSON.stringify(data ?? []));
      },
    },

    // -------------------------------------------------------------------------
    // get_recent_logs — select trực tiếp, RLS tự áp theo JWT
    // -------------------------------------------------------------------------
    {
      schema: {
        name: 'get_recent_logs',
        description:
          'Lấy nhật ký gần nhất của một nguồn dữ liệu: nutrition (bữa ăn), sleep (giấc ngủ chi tiết), steps (hoạt động), metrics (chỉ số khác: nhịp tim, cân nặng, SpO2...). Tối đa 100 dòng.',
        parameters: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              enum: ['nutrition', 'sleep', 'steps', 'metrics'],
              description: 'Nguồn nhật ký.',
            },
            days: {
              type: 'integer',
              description: 'Số ngày quay ngược, 1–30. Mặc định 7.',
            },
          },
          required: ['source'],
        },
      },
      execute: async (args) => {
        const source = String(args.source ?? 'nutrition');
        const days = Math.min(30, Math.max(1, Number(args.days) || 7));
        const since = new Date(Date.now() - days * 86400000).toISOString();

        let query;
        if (source === 'nutrition') {
          // Bỏ id/user_id/source — chỉ cột cần thiết (plan §5.4)
          query = user
            .from('nutrition_logs')
            .select('logged_on, meal, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g')
            .gte('logged_on', since.slice(0, 10))
            .order('logged_on', { ascending: false })
            .limit(100);
        } else if (source === 'sleep') {
          query = user
            .from('sleep_records')
            .select('sleep_date, total_minutes, deep_minutes, rem_minutes, awake_minutes, awakenings, quality_score')
            .gte('sleep_date', since.slice(0, 10))
            .order('sleep_date', { ascending: false })
            .limit(100);
        } else if (source === 'steps') {
          query = user
            .from('step_records')
            .select('recorded_on, steps, distance_km, calories_burned, active_minutes')
            .gte('recorded_on', since.slice(0, 10))
            .order('recorded_on', { ascending: false })
            .limit(100);
        } else {
          query = user
            .from('health_metrics')
            .select('metric_kind, value, unit, recorded_at')
            .gte('recorded_at', since)
            .order('recorded_at', { ascending: false })
            .limit(100);
        }

        const { data, error } = await query;
        if (error) throw new Error(`get_recent_logs: ${error.message}`);
        return truncate(JSON.stringify(data ?? []));
      },
    },
  ];

  // -------------------------------------------------------------------------
  // get_cycle_summary — CHỈ đăng ký khi profiles.cycle_enabled = true (§5.4)
  // -------------------------------------------------------------------------
  if (cycleEnabled) {
    tools.push({
      schema: {
        name: 'get_cycle_summary',
        description:
          'Lấy tóm tắt chu kỳ kinh nguyệt: 3 kỳ gần nhất (cycle_periods) và nhật ký triệu chứng 30 ngày gần nhất (cycle_daily_logs).',
        parameters: { type: 'object', properties: {} },
      },
      execute: async () => {
        const sinceDate = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
        const [periodsRes, logsRes] = await Promise.all([
          user
            .from('cycle_periods')
            .select('period_start, period_end, cycle_length')
            .eq('is_predicted', false)
            .order('period_start', { ascending: false })
            .limit(3),
          user
            .from('cycle_daily_logs')
            .select('log_date, flow, symptoms, mood, notes')
            .gte('log_date', sinceDate)
            .order('log_date', { ascending: false })
            .limit(31),
        ]);
        const error = periodsRes.error ?? logsRes.error;
        if (error) throw new Error(`get_cycle_summary: ${error.message}`);
        return truncate(
          JSON.stringify({
            recent_periods: periodsRes.data ?? [],
            daily_logs: logsRes.data ?? [],
          })
        );
      },
    });
  }

  return tools;
}
