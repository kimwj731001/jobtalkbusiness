import type { MessageCatalog } from '../locales.js';

/**
 * Tiếng Việt. Tập khóa phải khớp chính xác với ko.ts.
 *
 * ⚠️ Người dùng dựa vào những câu này để quyết định có đi làm hay không.
 *    Không được viết UNKNOWN theo cách nghe như là "được phép".
 */
export const vi: MessageCatalog = {
  // ── Trạng thái ──────────────────────────────────────────────
  'status.ELIGIBLE': 'Có vẻ được phép',
  'status.ELIGIBLE.description':
    'Theo các hướng dẫn đã được đối chiếu, không tìm thấy lý do hạn chế nào.',
  'status.CONDITIONAL': 'Được phép nếu đáp ứng điều kiện',
  'status.CONDITIONAL.description': 'Bạn có thể làm việc sau khi hoàn tất các bước dưới đây.',
  'status.INELIGIBLE': 'Không được phép',
  'status.INELIGIBLE.description': 'Hướng dẫn có quy định hạn chế đối với công việc này.',
  'status.UNKNOWN': 'Cần kiểm tra',
  'status.UNKNOWN.description':
    'Chúng tôi chưa kết luận vì thiếu căn cứ hoặc thiếu thông tin. Điều này không có nghĩa là được phép.',

  // ── Số giờ mỗi tuần ─────────────────────────────────────────
  'reason.WEEKLY_HOUR_EXCEEDED.PASS':
    'Nằm trong giới hạn giờ làm mỗi tuần. Hiện tại {currentWeeklyHours} giờ + tin này {postingWeeklyHours} giờ = {totalWeeklyHours} giờ (giới hạn {effectiveCapHours} giờ/tuần).',
  'reason.WEEKLY_HOUR_EXCEEDED.FAIL':
    'Vượt quá giới hạn giờ làm mỗi tuần. Hiện tại {currentWeeklyHours} giờ + tin này {postingWeeklyHours} giờ = {totalWeeklyHours} giờ, vượt giới hạn {effectiveCapHours} giờ/tuần.',

  // ── Ngành nghề ──────────────────────────────────────────────
  'reason.INDUSTRY_DENIED_MANUFACTURING.PASS':
    'Ngành của tin tuyển dụng này ({ksicCode}) không thuộc diện hạn chế sản xuất·xây dựng.',
  'reason.INDUSTRY_DENIED_MANUFACTURING.FAIL':
    'Với trình độ tiếng Hàn hiện tại, ngành sản xuất·xây dựng ({ksicCode}) bị hạn chế làm thêm.',
  'reason.INDUSTRY_EXCEPTION_DISCRETIONARY.PASS':
    'Ngành của tin tuyển dụng này ({ksicCode}) không thuộc diện xét ngoại lệ ngành sản xuất.',
  'reason.INDUSTRY_EXCEPTION_DISCRETIONARY.INDETERMINATE':
    'Nếu đạt yêu cầu về tiếng Hàn, ngành sản xuất ({ksicCode}) có thể được xét ngoại lệ, nhưng việc chấp thuận thuộc thẩm quyền xem xét của Cục Xuất nhập cảnh·Người nước ngoài quản lý khu vực. Chúng tôi không thể khẳng định là được phép.',
  'reason.INDUSTRY_DENIED_CONSTRUCTION.PASS':
    'Ngành của tin tuyển dụng này ({ksicCode}) không phải xây dựng.',
  'reason.INDUSTRY_DENIED_CONSTRUCTION.FAIL':
    'Ngành xây dựng ({ksicCode}) bị hạn chế làm thêm bất kể trình độ tiếng Hàn.',
  'reason.INDUSTRY_DENIED_SEAFARER.PASS':
    'Ngành của tin tuyển dụng này ({ksicCode}) không thuộc lao động thuyền viên.',
  'reason.INDUSTRY_DENIED_SEAFARER.FAIL':
    'Lao động thuyền viên ({ksicCode}) bị hạn chế làm thêm.',

  // ── Hình thức tuyển dụng ────────────────────────────────────
  'reason.EMPLOYMENT_FORM_DENIED.PASS':
    'Hình thức tuyển dụng ({employmentForm}) không thuộc diện hạn chế.',
  'reason.EMPLOYMENT_FORM_DENIED.FAIL':
    'Phái cử, khoán việc và lao động hình thức đặc thù (giao hàng, chuyển phát, lái xe hộ và tương tự) bị hạn chế làm thêm. Hình thức của tin này: {employmentForm}.',

  // ── Đi lại ──────────────────────────────────────────────────
  'reason.COMMUTE_EXCEEDED.PASS':
    'Thời gian di chuyển {commuteMinutes} phút, nằm trong giới hạn {limitMinutes} phút.',
  'reason.COMMUTE_EXCEEDED.FAIL':
    'Thời gian di chuyển {commuteMinutes} phút, vượt giới hạn {limitMinutes} phút.',

  // ── Giấy phép ───────────────────────────────────────────────
  'reason.PERMIT_REQUIRED_PART_TIME.PASS': 'Bạn đang có giấy phép làm thêm.',
  'reason.PERMIT_REQUIRED_PART_TIME.WARN':
    'Cần có giấy phép làm thêm. Bắt đầu làm việc trước khi được cấp phép là lao động bất hợp pháp. Làm việc trong lúc đang chờ xét duyệt cũng không được phép.',

  // ── E-9 ─────────────────────────────────────────────────────
  'reason.REGION_LOCKED.PASS': 'Nơi làm việc nằm trong cùng khu vực ({postingRegionCode}).',
  'reason.REGION_LOCKED.FAIL':
    'Việc chuyển nơi làm việc chỉ được thực hiện trong cùng khu vực. Hiện tại {currentRegionCode} → tin này {postingRegionCode}.',
  'reason.INDUSTRY_LOCKED.PASS': 'Cùng ngành với nơi làm việc hiện tại ({postingKsicCode}).',
  'reason.INDUSTRY_LOCKED.FAIL':
    'Việc chuyển nơi làm việc chỉ được thực hiện trong cùng ngành. Hiện tại {currentKsicCode} → tin này {postingKsicCode}.',
  'reason.CHANGE_COUNT_EXCEEDED.PASS':
    'Đã dùng {workplaceChangesUsed} lần chuyển nơi làm việc (giới hạn {maxChanges} lần).',
  'reason.CHANGE_COUNT_EXCEEDED.FAIL':
    'Bạn đã dùng hết {maxChanges} lần chuyển nơi làm việc. Những lần chuyển do lỗi của người sử dụng lao động — ngừng kinh doanh, đóng cửa, nợ lương — có thể không bị tính vào giới hạn này. Hãy hỏi Trung tâm Việc làm.',

  // ── Không thể kết luận ──────────────────────────────────────
  'reason.LOW_CONFIDENCE_RULE.INDETERMINATE':
    'Chúng tôi chưa đối chiếu mục này với văn bản hướng dẫn gốc nên không đưa ra kết luận. Hãy xác nhận với Cục Xuất nhập cảnh·Người nước ngoài quản lý khu vực hoặc phòng hợp tác quốc tế của trường.',
  'reason.MISSING_POSTING_FIELD.INDETERMINATE':
    'Tin tuyển dụng thiếu thông tin cần thiết để kết luận ({field}). Hãy xem tin gốc.',
  'reason.MISSING_PROFILE_FIELD.INDETERMINATE':
    'Hồ sơ của bạn thiếu thông tin cần thiết để kết luận ({field}). Hoàn tất hồ sơ để nhận kết quả.',
  'reason.MALFORMED_RULE_VALUE.INDETERMINATE':
    'Không thể kết luận do lỗi trong dữ liệu quy tắc của chúng tôi ({field}). Vui lòng báo cho chúng tôi.',
  'reason.NO_PROFILE.INDETERMINATE':
    'Không có hồ sơ visa nên không thể kết luận. Hãy nhập loại visa và bậc học để xem tin này có phù hợp với bạn không.',
  'reason.NO_RULES_FOUND.INDETERMINATE':
    'Chúng tôi chưa có quy tắc cho tư cách lưu trú {visa}.',

  // ── Việc cần làm ────────────────────────────────────────────
  'action.APPLY_PART_TIME_PERMIT': 'Xin giấy phép làm thêm',
  'action.APPLY_PART_TIME_PERMIT.description':
    'Ký hợp đồng lao động chuẩn → xin giấy xác nhận của trường → nộp đơn qua HiKorea hoặc cơ quan xuất nhập cảnh → bắt đầu làm việc sau khi được cấp phép. Lệ phí 20.000 won.',
  'action.CONSULT_IMMIGRATION_OFFICE': 'Liên hệ Cục Xuất nhập cảnh·Người nước ngoài',
  'action.CONSULT_IMMIGRATION_OFFICE.description':
    'Trường hợp này thuộc diện xét duyệt theo từng hồ sơ nên cần hỏi trước. Tổng đài tư vấn cho người nước ngoài 1345.',

  // ── Thông báo ───────────────────────────────────────────────
  'eligibility.disclaimer':
    'Kết quả này chỉ mang tính tham khảo. Quyết định cuối cùng thuộc về Cục Xuất nhập cảnh·Người nước ngoài quản lý khu vực.',
  'eligibility.e9NoBrokerage':
    'Việc chuyển nơi làm việc theo visa E-9 chỉ có thể thực hiện thông qua Trung tâm Việc làm. Dịch vụ này cung cấp thông tin trước và không làm môi giới việc làm.',
  'eligibility.ruleEffectiveDate': 'Hướng dẫn có hiệu lực từ {date}',

  // ── Mức độ tin cậy ──────────────────────────────────────────
  'confidence.high': 'Đã đối chiếu văn bản hướng dẫn và được chuyên gia thẩm định',
  'confidence.medium': 'Đã đối chiếu văn bản hướng dẫn, chưa thẩm định',
  'confidence.low': 'Chưa đối chiếu văn bản gốc — tạm chưa kết luận',
};
