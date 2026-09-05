// Javascript Logic for Sealy Trip LIFF Booking Form

// Pricing configuration
const DESTINATION_PRICES = {
  pp: { name: 'เกาะพีพี จ.กระบี่', price: 1500, isSpecialPromoEligible: true },
  similan: { name: 'หมู่เกาะสิมิลัน จ.พังงา', price: 2500, isSpecialPromoEligible: true },
  lipe: { name: 'เกาะหลีเป๊ะ จ.สตูล', price: 3500, isSpecialPromoEligible: true },
  samui: { name: 'เกาะสมุย จ.สุราษฎร์ธานี', price: 2900, isSpecialPromoEligible: false },
  phangan: { name: 'เกาะพะงัน จ.สุราษฎร์ธานี', price: 2900, isSpecialPromoEligible: false },
  tao: { name: 'เกาะเต่า จ.สุราษฎร์ธานี', price: 3200, isSpecialPromoEligible: false }
};

// Global variables
let userProfile = null;
let isUserAuthorizedToBook = false;

// Initialize LIFF App
async function initLiff() {
  // Set travel-date minimum date to today + 3 days
  const dateInput = document.getElementById('travel-date');
  if (dateInput) {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 3);
    const yyyy = minDate.getFullYear();
    const mm = String(minDate.getMonth() + 1).padStart(2, '0');
    const dd = String(minDate.getDate()).padStart(2, '0');
    dateInput.min = `${yyyy}-${mm}-${dd}`;
  }

  const liffId = window.LIFF_CONFIG?.liffId;
  if (!liffId) {
    console.error('LIFF ID is not defined in config.js');
    showStatusMessage('ไม่พบข้อมูล LIFF ID กรุณาตรวจสอบไฟล์คอนฟิก', true);
    return;
  }

  try {
    await liff.init({ liffId });
    if (liff.isLoggedIn()) {
      await loadProfile();
      await checkFriendshipStatus();
    } else {
      showLoginState();
    }
  } catch (error) {
    console.error('LIFF Initialization failed', error);
    showStatusMessage('ไม่สามารถเชื่อมต่อกับ LINE SDK ได้: ' + error.message, true);
  }
}

// Coupon & QR Code Discount States
let couponDiscount = 0;
let couponCodeApplied = '';
let couponLabel = '';

// Fetch user profile information
async function loadProfile() {
  try {
    userProfile = await liff.getProfile();
    document.getElementById('user-avatar').src = userProfile.pictureUrl || 'https://via.placeholder.com/60';
    document.getElementById('user-name').textContent = userProfile.displayName || 'คุณลูกค้า';
  } catch (error) {
    console.error('Error getting profile', error);
    document.getElementById('user-name').textContent = 'คุณลูกค้า';
  }
}

// Helpers for guests spinner control
window.increment = function (id) {
  const input = document.getElementById(id);
  const max = parseInt(input.getAttribute('max')) || 50;
  let val = parseInt(input.value) || 0;
  if (val < max) {
    input.value = val + 1;
    calculatePrice();
  }
};

window.decrement = function (id) {
  const input = document.getElementById(id);
  const min = parseInt(input.getAttribute('min')) || 0;
  let val = parseInt(input.value) || 0;
  if (val > min) {
    input.value = val - 1;
    calculatePrice();
  }
};

// Toggle text area for special needs
window.toggleSpecialNeedsDetail = function () {
  const checkbox = document.getElementById('has-special-needs');
  const container = document.getElementById('special-needs-detail-container');
  const textarea = document.getElementById('special-needs-detail');

  if (checkbox.checked) {
    container.classList.remove('hidden');
    textarea.focus();
  } else {
    container.classList.add('hidden');
    textarea.value = '';
  }
};

// Calculate pricing and validate promotions dynamically
window.calculatePrice = function () {
  const destSelect = document.getElementById('destination');
  const destKey = destSelect.value;
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const children = parseInt(document.getElementById('children').value) || 0;
  const totalGuests = adults + children;
  const travelDateVal = document.getElementById('travel-date').value;
  const dateError = document.getElementById('date-error');
  const submitBtn = document.getElementById('submit-btn');
  let isDateValid = true;

  // Strict 3-day advance booking validation check
  if (travelDateVal) {
    const travelDate = new Date(travelDateVal);
    travelDate.setHours(0, 0, 0, 0);

    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 3);
    minDate.setHours(0, 0, 0, 0);

    if (travelDate < minDate) {
      isDateValid = false;
    }
  }

  if (!isDateValid) {
    if (dateError) dateError.classList.remove('hidden');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
      submitBtn.style.cursor = 'not-allowed';
      if (!isUserAuthorizedToBook) {
        submitBtn.textContent = '❌ กรุณาเชื่อมต่อ LINE และแอดไลน์เพื่อนก่อน';
      }
    }
  } else {
    if (dateError) dateError.classList.add('hidden');
    if (submitBtn) {
      if (isUserAuthorizedToBook) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        submitBtn.textContent = '🏝️ ยืนยันการจองแพ็กเกจ';
      } else {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
        const friendshipChecked = userProfile !== null;
        submitBtn.textContent = friendshipChecked ? '❌ กรุณาแอดไลน์เป็นเพื่อนก่อนทำการจอง' : '❌ กรุณาเชื่อมต่อ LINE ก่อนทำการจอง';
      }
    }
  }

  // Render guest count label
  document.getElementById('total-guests-label').textContent = totalGuests;

  // Reset values if no destination selected
  if (!destKey) {
    updatePriceSummary(0, 0, 0);
    disableAllPromos();
    return;
  }

  const destData = DESTINATION_PRICES[destKey];
  const basePricePerPax = destData.price;
  const basePrice = basePricePerPax * totalGuests;

  // Validate Promotion Eligibility

  // 1. Couple Promo (💕 โปรคู่รัก)
  // Conditions: Total guests == 2, Island is PP/Similan/Lipe, Travel date is within current month
  let isCoupleEligible = false;
  let coupleReason = '';

  if (totalGuests !== 2) {
    coupleReason = 'ต้องมีผู้เดินทาง 2 ท่าน';
  } else if (!destData.isSpecialPromoEligible) {
    coupleReason = 'เฉพาะพีพี สิมิลัน และหลีเป๊ะ';
  } else {
    if (travelDateVal) {
      isCoupleEligible = true;
    } else {
      coupleReason = 'กรุณาระบุวันเดินทาง';
    }
  }
  updatePromoCard('couple', isCoupleEligible, coupleReason);

  // 2. Group Promo (👨‍👩‍👧‍👦 โปรมาเป็นกลุ่ม)
  // Conditions: Total guests >= 5 (applicable to all islands)
  let isGroupEligible = false;
  let groupReason = '';

  if (totalGuests >= 5) {
    isGroupEligible = true;
  } else {
    groupReason = 'ต้องจองตั้งแต่ 5 ท่านขึ้นไป';
  }
  updatePromoCard('group', isGroupEligible, groupReason);

  // 3. Birthday Promo (🎂 โปรวันเกิด)
  // Conditions: Island is PP/Similan/Lipe
  let isBirthdayEligible = false;
  let birthdayReason = '';

  if (destData.isSpecialPromoEligible) {
    isBirthdayEligible = true;
  } else {
    birthdayReason = 'เฉพาะพีพี สิมิลัน และหลีเป๊ะ';
  }
  updatePromoCard('birthday', isBirthdayEligible, birthdayReason);

  // Calculate discount based on selected promo option
  const selectedPromoInput = document.querySelector('input[name="promo"]:checked');
  let selectedPromo = selectedPromoInput ? selectedPromoInput.value : 'none';

  // Safeguard: If selected promo is no longer eligible, fall back to 'none'
  if (selectedPromo === 'couple' && !isCoupleEligible) selectedPromo = 'none';
  if (selectedPromo === 'group' && !isGroupEligible) selectedPromo = 'none';
  if (selectedPromo === 'birthday' && !isBirthdayEligible) selectedPromo = 'none';

  if (selectedPromo === 'none') {
    document.getElementById('card-promo-none').classList.add('active');
    document.querySelector('input[name="promo"][value="none"]').checked = true;
  }

  let discount = 0;
  let promoLabel = 'ส่วนลด';

  if (selectedPromo === 'couple') {
    discount = basePrice * 0.10;
    promoLabel = 'ส่วนลดโปรคู่รัก (10%)';
  } else if (selectedPromo === 'group') {
    discount = basePrice * 0.15;
    promoLabel = 'ส่วนลดโปรกลุ่ม (15%)';
  } else if (selectedPromo === 'birthday') {
    discount = 0; // ไม่นำไปคิดเป็นส่วนลดทันทีในหน้าฟอร์ม
    promoLabel = 'ส่วนลดโปรวันเกิด';
  }

  // Apply Coupon / QR Code Discount
  if (couponCodeApplied) {
    if (couponCodeApplied === 'LUCKY10') {
      discount += basePrice * 0.10;
      promoLabel = promoLabel !== 'ส่วนลด' ? `${promoLabel} + ${couponLabel}` : couponLabel;
    } else {
      discount += couponDiscount;
      promoLabel = promoLabel !== 'ส่วนลด' ? `${promoLabel} + ${couponLabel}` : couponLabel;
    }
  }

  // Ensure discount doesn't exceed base price
  discount = Math.min(discount, basePrice);
  const netTotal = basePrice - discount;

  // Update UI Elements
  updatePriceSummary(basePrice, discount, netTotal, promoLabel, selectedPromo);

  // Toggle birthday warning notice
  const bdayNotice = document.getElementById('birthday-warning');
  if (selectedPromo === 'birthday') {
    bdayNotice.classList.remove('hidden');
  } else {
    bdayNotice.classList.add('hidden');
  }
};

// Update pricing UI helper
function updatePriceSummary(base, discount, total, promoLabel = 'ส่วนลด', selectedPromo = 'none') {
  document.getElementById('price-base').textContent = `฿${base.toLocaleString()}`;
  document.getElementById('price-total').textContent = `฿${total.toLocaleString()}`;

  const discountContainer = document.getElementById('discount-container');
  const discountLabel = document.getElementById('price-discount');
  const promoLabelSpan = document.getElementById('applied-promo-label');

  if (selectedPromo === 'birthday') {
    promoLabelSpan.textContent = promoLabel;
    discountLabel.textContent = 'รอตรวจสอบสิทธิ์ (-฿1,000)';
    discountLabel.className = 'text-warning';
    discountContainer.classList.remove('hidden');
  } else if (discount > 0) {
    promoLabelSpan.textContent = promoLabel;
    discountLabel.textContent = `-฿${discount.toLocaleString()}`;
    discountLabel.className = 'text-green';
    discountContainer.classList.remove('hidden');
  } else {
    discountContainer.classList.add('hidden');
  }
}

// Disable all promotion choices (e.g. when no destination is selected)
function disableAllPromos() {
  ['couple', 'group', 'birthday'].forEach(promo => {
    updatePromoCard(promo, false, 'กรุณาเลือกจุดหมายปลายทางก่อน');
  });
}

// Update single promo card element class states and badges
function updatePromoCard(promoId, isEligible, reasonMsg) {
  const card = document.getElementById(`card-promo-${promoId}`);
  const radio = card.querySelector('input[type="radio"]');
  const badge = document.getElementById(`badge-${promoId}`);

  // Clean class states first
  card.classList.remove('active', 'active-eligible', 'disabled');

  if (isEligible) {
    radio.disabled = false;
    badge.textContent = 'ได้รับสิทธิ์';

    if (radio.checked) {
      card.classList.add('active');
    } else {
      card.classList.add('active-eligible');
    }
  } else {
    radio.disabled = true;
    if (radio.checked) {
      radio.checked = false;
      document.querySelector('input[name="promo"][value="none"]').checked = true;
    }
    badge.textContent = reasonMsg;
    card.classList.add('disabled');
  }
}

// Form Submission Event
document.getElementById('booking-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  if (!isUserAuthorizedToBook) {
    alert('❌ ไม่สามารถดำเนินการจองทัวร์ได้\n\nกรุณาเชื่อมต่อ LINE และแอดไลน์เป็นเพื่อนกับ Sealy Trip ก่อนทำการจองทัวร์ เพื่อรับใบยืนยันการจองในแชตส่วนตัวของคุณครับ');
    return;
  }

  const destSelect = document.getElementById('destination');
  const destKey = destSelect.value;
  const travelDateVal = document.getElementById('travel-date').value;
  const adults = parseInt(document.getElementById('adults').value) || 0;
  const children = parseInt(document.getElementById('children').value) || 0;
  const hasSpecialNeeds = document.getElementById('has-special-needs').checked;
  const specialNeedsDetail = document.getElementById('special-needs-detail').value.trim();

  const selectedPromoInput = document.querySelector('input[name="promo"]:checked');
  const selectedPromo = selectedPromoInput ? selectedPromoInput.value : 'none';

  // Basic Validations
  if (!destKey) {
    alert('กรุณาเลือกจุดหมายปลายทางด้วยครับ');
    return;
  }
  if (!travelDateVal) {
    alert('กรุณาเลือกวันที่เริ่มเดินทางด้วยครับ');
    return;
  }

  // Double check 3-day validation
  const travelDate = new Date(travelDateVal);
  travelDate.setHours(0, 0, 0, 0);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 3);
  minDate.setHours(0, 0, 0, 0);

  if (travelDate < minDate) {
    alert('⚠️ กรุณาเลือกวันเดินทางล่วงหน้าอย่างน้อย 3 วันครับ');
    return;
  }

  // Destination Data
  const destName = DESTINATION_PRICES[destKey].name;
  const pricePerPax = DESTINATION_PRICES[destKey].price;
  const totalGuests = adults + children;
  const basePrice = pricePerPax * totalGuests;

  // Calculate promo and discounts final validation
  let discount = 0;
  let promoNameText = 'ไม่ใช้โปรโมชัน';

  if (selectedPromo === 'couple') {
    discount = basePrice * 0.10;
    promoNameText = '💕 โปรคู่รัก (ส่วนลด 10%)';
  } else if (selectedPromo === 'group') {
    discount = basePrice * 0.15;
    promoNameText = '👨‍👩‍👧‍👦 โปรมาเป็นกลุ่ม (ส่วนลด 15%)';
  } else if (selectedPromo === 'birthday') {
    discount = 0; // ไม่คิดเป็นส่วนลดทันที
    promoNameText = '🎂 โปรวันเกิด (รอแอดมินยืนยันสิทธิ์ลด ฿1,000)';
  }

  // Include Coupon Discount in Submit Validation
  if (couponCodeApplied) {
    if (couponCodeApplied === 'LUCKY10') {
      discount += basePrice * 0.10;
      promoNameText = promoNameText !== 'ไม่ใช้โปรโมชัน' ? `${promoNameText} + ${couponLabel}` : couponLabel;
    } else {
      discount += couponDiscount;
      promoNameText = promoNameText !== 'ไม่ใช้โปรโมชัน' ? `${promoNameText} + ${couponLabel}` : couponLabel;
    }
  }

  discount = Math.min(discount, basePrice);
  const netTotal = basePrice - discount;

  // Parse Travel Date to Calendar Format
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const dateObj = new Date(travelDateVal);
  const monthStr = months[dateObj.getMonth()] || 'DAY';
  const dayStr = String(dateObj.getDate()) || '??';
  const weekdayStr = weekdays[dateObj.getDay()] || 'TMR';

  // Get matching pier location text
  const DESTINATION_LOCATIONS = {
    pp: 'ท่าเรืออ่าวฉลอง จ.กระบี่/ภูเก็ต',
    similan: 'ท่าเรือทับละมุ จ.พังงา',
    lipe: 'ท่าเรือปากบารา จ.สตูล',
    samui: 'ท่าเรือหน้าทอน เกาะสมุย จ.สุราษฎร์ธานี',
    phangan: 'ท่าเรือท้องศาลา เกาะพะงัน จ.สุราษฎร์ธานี',
    tao: 'ท่าเรือแม่หาด เกาะเต่า จ.สุราษฎร์ธานี'
  };
  const locationText = DESTINATION_LOCATIONS[destKey] || 'โปรดติดต่อแอดมินเพื่อเช็กจุดนัดพบ';

  const nameDisplay = userProfile ? userProfile.displayName : 'คุณลูกค้า';

  // Construct LINE Flex Message Payload
  const flexPayload = {
    type: "bubble",
    size: "giga",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#0d2f56",
      paddingAll: "20px",
      contents: [
        {
          type: "text",
          text: "ยืนยันการจองทัวร์ (Booking Confirmed)",
          color: "#FFFFFF",
          weight: "bold",
          size: "md"
        },
        {
          type: "text",
          text: "ส่งใบจองสำเร็จแล้ว! กรุณาโอนเงินและส่งสลิปเพื่อยืนยัน",
          color: "#FFFFFFcc",
          size: "xs",
          margin: "sm"
        }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "lg",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          spacing: "md",
          contents: [
            {
              type: "box",
              layout: "vertical",
              backgroundColor: "#e8eef6",
              cornerRadius: "12px",
              paddingAll: "12px",
              flex: 1,
              contents: [
                {
                  type: "text",
                  text: monthStr,
                  size: "xs",
                  color: "#0d2f56",
                  align: "center",
                  weight: "bold"
                },
                {
                  type: "text",
                  text: dayStr,
                  size: "xxl",
                  color: "#0d2f56",
                  align: "center",
                  weight: "bold"
                },
                {
                  type: "text",
                  text: weekdayStr,
                  size: "xs",
                  color: "#0d2f56",
                  align: "center"
                }
              ]
            },
            {
              type: "box",
              layout: "vertical",
              flex: 3,
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: destName,
                  weight: "bold",
                  size: "md"
                },
                {
                  type: "box",
                  layout: "horizontal",
                  spacing: "sm",
                  contents: [
                    {
                      type: "text",
                      text: "ออกเดินทาง: 08:30 น.",
                      size: "sm",
                      color: "#0d2f56",
                      weight: "bold"
                    }
                  ]
                },
                {
                  type: "text",
                  text: `ผู้จอง: ${nameDisplay}`,
                  size: "xs",
                  color: "#666666"
                },
                {
                  type: "text",
                  text: `ผู้เดินทาง: ผู้ใหญ่ ${adults} ท่าน, เด็ก ${children} ท่าน`,
                  size: "xs",
                  color: "#666666"
                },
                {
                  type: "text",
                  text: hasSpecialNeeds && specialNeedsDetail ? `♿ ความต้องการพิเศษ: ${specialNeedsDetail}` : "♿ ความต้องการพิเศษ: ไม่มี",
                  size: "xs",
                  color: "#999999",
                  wrap: true
                }
              ]
            }
          ]
        },
        {
          type: "separator"
        },
        {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "จุดนัดพบ",
                  size: "sm",
                  color: "#999999",
                  flex: 2
                },
                {
                  type: "text",
                  text: locationText,
                  size: "sm",
                  flex: 3,
                  wrap: true
                }
              ]
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "โปรโมชัน",
                  size: "sm",
                  color: "#999999",
                  flex: 2
                },
                {
                  type: "text",
                  text: promoNameText,
                  size: "sm",
                  flex: 3,
                  wrap: true
                }
              ]
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "โอนผ่านธนาคาร",
                  size: "sm",
                  color: "#999999",
                  flex: 2
                },
                {
                  type: "text",
                  text: "กสิกรไทย 123-4-56789-0 (บจก. ซีลี่ ทริป ทราเวล)",
                  size: "sm",
                  flex: 3,
                  wrap: true
                }
              ]
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "ยอดชำระสุทธิ",
                  size: "sm",
                  color: "#999999",
                  flex: 2
                },
                {
                  type: "text",
                  text: selectedPromo === 'birthday' ? `฿${basePrice.toLocaleString()} (รอหักส่วนลดวันเกิด)` : `฿${netTotal.toLocaleString()}`,
                  size: "sm",
                  weight: "bold",
                  color: selectedPromo === 'birthday' ? "#d97706" : "#0d2f56",
                  flex: 3
                }
              ]
            }
          ]
        }
      ]
    }
  };

  // Trigger Service Message & Push Ticket API via Backend (to deliver to 1-on-1 chat with LINE OA)
  triggerBackendServiceMessage(destName, travelDateVal, adults, children, netTotal, flexPayload);

  alert('บันทึกข้อมูลการจองทัวร์สำเร็จแล้วครับ! ใบยืนยันการจองทัวร์ของคุณจะถูกจัดส่งเข้าทางช่องแชต LINE Official Account ของ Sealy Trip โดยตรง');

  if (liff.isInClient()) {
    liff.closeWindow();
  } else {
    // If running in external browser, display overlay for desktop testing
    showBookingOverlay(JSON.stringify(flexPayload, null, 2));
  }
});

// Overlay block for desktop testing
function showBookingOverlay(msg) {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
  overlay.style.zIndex = '9999';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.padding = '20px';
  overlay.style.fontFamily = 'Prompt, sans-serif';

  overlay.innerHTML = `
    <div style="background:#fff; padding:25px; border-radius:15px; width:100%; max-width:400px; text-align:center;">
      <h3 style="color:#0f8c8c; margin-bottom:15px;">สรุปข้อมูลการส่งเข้าแชท LINE</h3>
      <pre style="text-align:left; background:#f1f5f9; padding:15px; border-radius:8px; white-space:pre-wrap; font-size:0.85rem; margin-bottom:20px;">${msg}</pre>
      <button id="close-overlay-btn" style="background:#0f8c8c; color:#fff; border:none; padding:10px 20px; border-radius:8px; font-weight:600; cursor:pointer;">ปิดหน้าต่าง</button>
    </div>
  `;

  document.body.appendChild(overlay);
  document.getElementById('close-overlay-btn').onclick = () => {
    document.body.removeChild(overlay);
  };
}

// Fallback message showing
function showStatusMessage(msg, isError = false) {
  const errDiv = document.createElement('div');
  errDiv.style.background = isError ? '#fee2e2' : '#e0f2fe';
  errDiv.style.color = isError ? '#b91c1c' : '#0369a1';
  errDiv.style.padding = '12px 15px';
  errDiv.style.borderRadius = '10px';
  errDiv.style.fontSize = '0.9rem';
  errDiv.style.marginBottom = '15px';
  errDiv.style.textAlign = 'center';
  errDiv.textContent = msg;

  const card = document.querySelector('.booking-card');
  card.insertBefore(errDiv, card.firstChild);
}

// Copy bank account to clipboard helper
window.copyAccountNumber = function () {
  const accNum = '123-4-56789-0';
  navigator.clipboard.writeText(accNum).then(() => {
    alert('📋 คัดลอกเลขบัญชี 123-4-56789-0 เรียบร้อยแล้ว!');
  }).catch(err => {
    console.error('Clipboard copy failed', err);
    alert('ไม่สามารถคัดลอกได้โดยอัตโนมัติ เลขบัญชีคือ: ' + accNum);
  });
};

// Bind DOM event triggers
document.getElementById('destination').onchange = calculatePrice;
document.getElementById('travel-date').onchange = calculatePrice;

// -------------------------------------------------------------
// Interactive Coupon & Scan & Share SDK API Functions
// -------------------------------------------------------------

// 1. Coupon Discount Calculation Logic
window.applyCoupon = function () {
  const code = document.getElementById('coupon-code').value.trim().toUpperCase();
  const statusEl = document.getElementById('coupon-status');

  if (!code) {
    couponDiscount = 0;
    couponCodeApplied = '';
    couponLabel = '';
    statusEl.textContent = '';
    calculatePrice();
    return;
  }

  // Match any code in format SEALY<amount> where amount is between 100 and 1000
  const sealyMatch = code.match(/^SEALY(1000|[1-9]\d{2})$/);

  if (sealyMatch) {
    const amount = parseInt(sealyMatch[1], 10);
    couponDiscount = amount;
    couponCodeApplied = code;
    couponLabel = `🎟️ โค้ด ${code} (ลด ฿${amount})`;
    statusEl.textContent = `✅ ใช้โค้ดลด ${amount} บาทสำเร็จ!`;
    statusEl.style.color = '#10b981';
  } else if (code === 'VIP500') {
    couponDiscount = 500;
    couponCodeApplied = 'VIP500';
    couponLabel = '🎟️ โค้ด VIP500 (ลด ฿500)';
    statusEl.textContent = '✅ ใช้โค้ดลด 500 บาทสำเร็จ!';
    statusEl.style.color = '#10b981';
  } else if (code === 'LUCKY10') {
    couponDiscount = 0.10;
    couponCodeApplied = 'LUCKY10';
    couponLabel = '🎟️ โค้ด LUCKY10 (ลด 10%)';
    statusEl.textContent = '✅ ใช้โค้ดลด 10% สำเร็จ!';
    statusEl.style.color = '#10b981';
  } else {
    couponDiscount = 0;
    couponCodeApplied = '';
    couponLabel = '';
    statusEl.textContent = '❌ โค้ดส่วนลดไม่ถูกต้องหรือหมดอายุ';
    statusEl.style.color = '#ef4444';
  }

  calculatePrice();
};

// 2. Scan QR Code via liff.scanCodeV2()
window.scanPromoQr = async function () {
  const statusEl = document.getElementById('coupon-status');
  statusEl.textContent = 'กำลังเรียกใช้งานกล้องสแกน...';
  statusEl.style.color = '#666';

  if (liff.isApiAvailable && liff.isApiAvailable('scanCodeV2')) {
    try {
      const result = await liff.scanCodeV2();
      if (result && result.value) {
        document.getElementById('coupon-code').value = result.value;
        applyCoupon();
      } else {
        statusEl.textContent = 'ℹ️ ยกเลิกการสแกน QR Code';
        statusEl.style.color = '#666';
      }
    } catch (error) {
      console.error('scanCodeV2 failed', error);
      statusEl.textContent = '❌ เกิดข้อผิดพลาดในการสแกน: ' + error.message;
      statusEl.style.color = '#ef4444';
    }
  } else {
    // Desktop Web browser fallback
    const code = prompt('อุปกรณ์หรือบราวเซอร์นี้ไม่รองรับการสแกนกล้องโดยตรง\nกรุณากรอกโค้ดส่วนลดด้วยตัวเอง (ทดสอบ: SEALY100, VIP500, LUCKY10):');
    if (code !== null) {
      document.getElementById('coupon-code').value = code;
      applyCoupon();
    } else {
      statusEl.textContent = 'ℹ️ ยกเลิกการกรอกโค้ด';
      statusEl.style.color = '#666';
    }
  }
};

// 3. Share target picker for friend recommendation
window.shareTourToFriends = async function () {
  if (!liff.isApiAvailable || !liff.isApiAvailable('shareTargetPicker')) {
    alert('ระบบไม่รองรับการแชร์หาเพื่อนผ่านช่องทางนี้ (liff.shareTargetPicker)');
    return;
  }

  const destSelect = document.getElementById('destination');
  const destKey = destSelect.value;
  if (!destKey) {
    alert('กรุณาเลือกจุดหมายปลายทางที่ต้องการแนะนำก่อนแชร์ครับ');
    return;
  }

  const destName = destSelect.options[destSelect.selectedIndex].text;
  const liffUrl = `line://app/${window.LIFF_CONFIG?.liffId || '2010630162-RcvmhD79'}`;

  const sharePayload = {
    type: "bubble",
    hero: {
      type: "image",
      url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80",
      size: "full",
      aspectRatio: "20:13",
      aspectMode: "cover"
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        {
          type: "text",
          text: `🏝️ ชวนเที่ยวทริปสุดพรีเมียม: ${destName}`,
          weight: "bold",
          size: "lg",
          color: "#0d2f56"
        },
        {
          type: "text",
          text: "เพื่อนของคุณชวนร่วมท่องเที่ยวไปกับแพ็กเกจทัวร์สุดฟินของ Sealy Trip สนใจจองเดินทางรับส่วนลดโปรโมชันดีๆ คลิกดูรายละเอียดเลย!",
          size: "sm",
          color: "#666666",
          wrap: true
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#0d2f56",
          action: {
            type: "uri",
            label: "เปิดหน้าต่างจองทัวร์",
            uri: liffUrl
          }
        }
      ]
    }
  };

  try {
    const result = await liff.shareTargetPicker([
      {
        type: 'flex',
        altText: `ชวนเที่ยวทริปพิเศษ: ${destName} กับ Sealy Trip 🏝️`,
        contents: sharePayload
      }
    ]);
    if (result) {
      alert('แชร์การเดินทางแนะนำให้เพื่อนเรียบร้อยแล้ว!');
    }
  } catch (error) {
    console.error('shareTargetPicker failed', error);
    alert('แชร์ข้อความไม่สำเร็จ: ' + error.message);
  }
};

// 4. Trigger Service Message API in backend
async function triggerBackendServiceMessage(destName, travelDateVal, adults, children, netTotal, flexPayload) {
  try {
    const accessToken = liff.getAccessToken();
    const userId = userProfile?.userId || '';
    if (accessToken) {
      console.log('[ServiceMessage] Sending access token to backend to exchange notifier token and push Flex ticket...');
      const response = await fetch('/api/send-service-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken,
          userId,
          flexPayload,
          bookingDetails: {
            destination: destName,
            date: travelDateVal,
            guests: `ผู้ใหญ่ ${adults} ท่าน, เด็ก ${children} ท่าน`,
            total: netTotal
          }
        })
      });
      const data = await response.json();
      console.log('[ServiceMessage] Response from backend:', data);
    }
  } catch (err) {
    console.warn('[ServiceMessage] API request failed:', err.message);
  }
}

// 5. Show LINE Login requirement button in profile header
function showLoginState() {
  isUserAuthorizedToBook = false;
  const userN = document.getElementById('user-name');
  const userA = document.getElementById('user-avatar');
  const submitBtn = document.getElementById('submit-btn');

  if (userN) {
    userN.innerHTML = `
      <div style="font-size: 1.05rem; font-weight: bold; display: flex; flex-direction: column; gap: 6px; align-items: flex-start;">
        <span>🔒 เชื่อมต่อ LINE ก่อนจองทัวร์</span>
        <button onclick="liff.login()" style="background: #06b6d4; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 5px rgba(6, 182, 212, 0.2);">
          🔑 เข้าสู่ระบบ LINE (Login)
        </button>
      </div>
    `;
  }
  if (userA) {
    userA.src = 'https://via.placeholder.com/60/06b6d4/ffffff?text=LINE';
  }

  // Disable form submit
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.background = '#64748b'; // gray
    submitBtn.style.cursor = 'not-allowed';
    submitBtn.textContent = '❌ กรุณาเชื่อมต่อ LINE ก่อนทำการจอง';
  }
}

// 6. Check LINE OA Friendship and prompt Add Friend action if not friends
async function checkFriendshipStatus() {
  const submitBtn = document.getElementById('submit-btn');
  const userN = document.getElementById('user-name');
  const userA = document.getElementById('user-avatar');
  const botId = window.LIFF_CONFIG?.botId || '@289toxyz';

  try {
    const friendship = await liff.getFriendship();
    if (!friendship.friendFlag) {
      // Not friends!
      isUserAuthorizedToBook = false;
      if (userN) {
        userN.innerHTML = `
          <div style="color: #ef4444; font-size: 1.0rem; font-weight: bold; display: flex; flex-direction: column; gap: 6px; align-items: flex-start;">
            <span>⚠️ ยังไม่ได้เพิ่มเพื่อนกับ Sealy Trip</span>
            <a href="https://line.me/R/ti/p/${botId}" target="_blank" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 0.8rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 5px rgba(16, 185, 129, 0.2);">
              แอดไลน์เพิ่มเพื่อนที่นี่
            </a>
          </div>
        `;
      }
      if (userA) {
        userA.src = 'https://via.placeholder.com/60/ef4444/ffffff?text=%E2%9A%A0%EF%B8%8F'; // Red warning icon
      }

      // Disable form submit
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.background = '#64748b'; // gray
        submitBtn.style.cursor = 'not-allowed';
        submitBtn.textContent = '❌ กรุณาแอดไลน์เป็นเพื่อนก่อนทำการจอง';
      }
    } else {
      // Friends!
      isUserAuthorizedToBook = true;
      // Enable submit
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.background = '#0d2f56'; // premium dark blue
        submitBtn.style.cursor = 'pointer';
        submitBtn.textContent = 'ยืนยันการจองทัวร์ (รับใบจอง)';
      }
    }
  } catch (error) {
    console.error('Error checking friendship:', error);
  }
}

// Launch App
initLiff();
