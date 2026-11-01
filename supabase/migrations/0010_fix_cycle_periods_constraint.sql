-- Migration 0010: Fix cycle_periods unique constraint to allow multiple historical periods
-- Cho phép người dùng lưu nhiều kỳ kinh khác nhau trong lịch sử (thay vì chỉ lưu 1 kỳ duy nhất)

BEGIN;

-- Xóa ràng buộc cũ (chỉ cho phép 1 bản ghi is_predicted = false duy nhất mỗi user)
ALTER TABLE public.cycle_periods DROP CONSTRAINT IF EXISTS uq_cycle_periods_user_latest;

-- Thêm ràng buộc mới: mỗi user không được trùng period_start
ALTER TABLE public.cycle_periods ADD CONSTRAINT uq_cycle_periods_user_start UNIQUE (user_id, period_start);

COMMIT;
