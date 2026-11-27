/* LA PLAGE · Vietnamese version of the site (tiếng Việt).

   Add it to the <head> of every customer page, right after the viewport meta, as a plain script (no defer):
     <script src="i18n.js?v=1"></script>
   Nothing else in the site needs to change. The admin panel stays in English (leave admin.html without it).

   How it works
   - The language is the visitor's choice (EN / VI switch in the header and footer), remembered on their device.
     The first time, Vietnamese is shown to anyone whose phone or browser is set to Vietnamese, English to everyone else.
     ?lang=vi or ?lang=en in a link also sets it (handy for Instagram and Zalo links).
   - English stays in the HTML and the scripts. In Vietnamese, the text is swapped for the translation below just
     before main.js runs, and anything the scripts add later (the shop, product view, pre-order form, account,
     payment, contact) is translated as it appears.
   - Kept in English on purpose, as the brand voice: LA PLAGE, product names, line names (Shoreline, Soleil, Marée),
     colour names, and the "Dressed for golden hour." hero.

   Editing the copy
   - T: exact text → translation. The key must match the English on the site exactly (spacing does not matter).
   - H: a sentence with links or emphasis inside it. Write the tags bare (<a>, <em>, <strong>), in the same order
     as on the page; the real links keep their addresses.
   - When you change English text anywhere on the site, change its key here too, or that line stays in English.
     Missing lines simply show in English; nothing breaks. */
(() => {
  'use strict';

  /* ---------------- which language ---------------- */
  const KEY = 'laplage-lang';
  const LANGS = ['vi', 'en'];
  const store = {
    get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode */ } },
  };
  const asked = new URLSearchParams(location.search).get('lang');
  if (LANGS.includes(asked)) store.set(asked);
  const saved = store.get();
  const browserVi = (navigator.languages || [navigator.language || '']).some((l) => /^vi\b/i.test(l || ''));
  const lang = LANGS.includes(saved) ? saved : (browserVi ? 'vi' : 'en');
  window.LAPLAGE_LANG = lang;
  document.documentElement.lang = lang;

  /* ---------------- the EN / VI switch ---------------- */
  const CSS = `
.lp-lang{display:inline-flex;align-items:center;gap:.55em;font-size:11px;letter-spacing:.22em;text-transform:uppercase;line-height:1;white-space:nowrap}
.lp-lang button{all:unset;cursor:pointer;display:inline-flex;align-items:center;min-height:44px;opacity:.55;transition:opacity .25s ease}
.lp-lang button[aria-pressed="true"]{opacity:1;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:5px}
.lp-lang button:hover{opacity:1}
.lp-lang button:focus-visible{opacity:1;outline:1px solid currentColor;outline-offset:4px}
.lp-lang__sep{opacity:.35}
.nav__links li.nav__lang-item{display:flex;align-items:center}
.nav:not(.is-glass) .lp-lang{text-shadow:0 0 8px rgba(255,255,255,.8),0 0 2px rgba(255,255,255,.6)}
@media (min-width:641px){.nav:not(.is-glass) .lp-lang{text-shadow:0 1px 12px rgba(11,44,71,.35)}}
@media (max-width:640px){
  .nav__links li.nav__lang-item{position:absolute;top:0;left:var(--gutter)}
  .nav .lp-lang{font-size:10px;letter-spacing:.18em}
  .nav .lp-lang button{min-height:40px}
}
.lp-bar-tools{display:flex;align-items:center;gap:22px}
.portal__bar .lp-lang{color:var(--ink-soft)}
.footer__locale .lp-lang{font-size:11px;letter-spacing:.16em}`;

  const choose = (code) => {
    if (code === lang) return;
    store.set(code);
    const u = new URL(location.href);
    u.searchParams.delete('lang');
    if (u.href !== location.href) location.replace(u.href); else location.reload();
  };
  const makeSwitch = () => {
    const box = document.createElement('div');
    box.className = 'lp-lang';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Ngôn ngữ / Language');
    box.setAttribute('data-i18n-skip', '');
    box.innerHTML = `<button type="button" lang="en" aria-label="English" aria-pressed="${lang === 'en'}">EN</button><span class="lp-lang__sep" aria-hidden="true">/</span><button type="button" lang="vi" aria-label="Tiếng Việt" aria-pressed="${lang === 'vi'}">VI</button>`;
    box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => choose(b.lang)));
    return box;
  };
  const mountSwitch = () => {
    if (document.querySelector('.lp-lang')) return;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    // home page: in the header, next to Sign in (top-left corner on phones), and in the footer beside VND
    const navList = document.querySelector('.nav__links ul');
    if (navList) {
      const li = document.createElement('li');
      li.className = 'nav__lang-item';
      li.appendChild(makeSwitch());
      navList.appendChild(li);
    }
    const foot = document.querySelector('.footer__locale');
    if (foot) foot.prepend(makeSwitch());
    // other pages: in the top bar, beside "Back to the shop"
    const bar = document.querySelector('.portal__bar');
    const back = bar && bar.querySelector('.portal__back');
    if (back) {
      const tools = document.createElement('div');
      tools.className = 'lp-bar-tools';
      back.replaceWith(tools);
      tools.append(makeSwitch(), back);
    }
  };

  /* ---------------- translations ---------------- */
  const T = {
    // header, announcement, footer
    'Skip to content': 'Chuyển đến nội dung',
    'Free shipping in Saigon': 'Freeship Sài Gòn',   // the bar is one line on phones: keep these short
    'Two shorts for 925.000 ₫': '2 quần short 925.000 ₫',
    'Limited runs': 'Số lượng giới hạn',
    'LA PLAGE, back to top': 'LA PLAGE, về đầu trang',
    'LA PLAGE, back to the shop': 'LA PLAGE, quay lại cửa hàng',
    'Back to the shop': 'Quay lại cửa hàng',
    'Sections': 'Các mục',
    'Shop': 'Cửa hàng',
    'Story': 'Câu chuyện',
    'Sign in': 'Đăng nhập',
    'Account': 'Tài khoản',
    'House': 'Về LA PLAGE',
    'Help': 'Hỗ trợ',
    'Follow': 'Theo dõi',
    'Email us': 'Gửi email cho chúng tôi',
    'Colour guide': 'Bảng màu',
    'Pre-order': 'Đặt trước',
    'Pre-orders': 'Đặt trước',
    'Unsubscribe': 'Hủy nhận email',
    'Shipping': 'Giao hàng',
    'Returns': 'Đổi trả',
    'Size guide': 'Bảng size',
    'Contact': 'Liên hệ',
    'Legal': 'Pháp lý',
    'Privacy Policy': 'Chính sách bảo mật',
    'Terms of Use': 'Điều khoản sử dụng',
    'LA PLAGE. Made in Vietnam.': 'LA PLAGE. Làm tại Việt Nam.',
    'Loading…': 'Đang tải…',

    // page titles and descriptions
    'Your account': 'Tài khoản của bạn',
    'LA PLAGE. Beachwear made by students in Saigon. Few pieces, made well. Drop 001 · Summer.': 'LA PLAGE. Đồ đi biển do sinh viên Sài Gòn làm ra. Ít mẫu, làm kỹ. Drop 001 · Mùa hè.',
    'Shipping, returns, sizes and how to reach LA PLAGE.': 'Giao hàng, đổi trả, bảng size và cách liên hệ LA PLAGE.',
    'How LA PLAGE collects, uses and protects your personal data.': 'Cách LA PLAGE thu thập, sử dụng và bảo vệ dữ liệu cá nhân của bạn.',
    'The terms for using the LA PLAGE website, mailing list and pre-orders.': 'Điều khoản sử dụng trang web, danh sách nhận email và dịch vụ đặt trước của LA PLAGE.',
    'Send a message to LA PLAGE.': 'Gửi tin nhắn cho LA PLAGE.',
    'Stop LA PLAGE emails.': 'Ngừng nhận email từ LA PLAGE.',
    'Every LA PLAGE print up close: the pattern, its colours and the embroidered patch.': 'Cận cảnh từng họa tiết của LA PLAGE: hoa văn, màu sắc và miếng thêu.',

    // home page
    'LA PLAGE logo. Drag to turn it around.': 'Logo LA PLAGE. Kéo để xoay.',
    'Summer': 'Mùa hè',
    'Made in Saigon': 'Làm tại Sài Gòn',
    'Enter the collection': 'Xem bộ sưu tập',
    'Afloat': 'Bồng bềnh',
    'Featured pieces': 'Mẫu nổi bật',
    'Lagon Short in blue camo hibiscus resting on a sun lounger beside a bright blue pool': 'Quần Lagon Short họa tiết camo dâm bụt xanh đặt trên ghế tắm nắng cạnh hồ bơi xanh',
    'Corail Short in pink floral hung over a wooden rail at sunset with the sea behind': 'Quần Corail Short họa tiết hoa hồng vắt trên lan can gỗ lúc hoàng hôn, phía sau là biển',
    'Palmier Short in palm print laid on a surfboard on the sand beside two coconuts': 'Quần Palmier Short họa tiết cây cọ đặt trên ván lướt sóng trên cát, cạnh hai trái dừa',
    'The drop': 'Bộ sưu tập',
    'Inspiration': 'Cảm hứng',
    'Faded beach-cabin stripes, hibiscus in two blues, and palms sketched by hand.': 'Sọc phai màu như những căn chòi bãi biển, hoa dâm bụt hai tông xanh, và những tán cọ vẽ tay.',
    'Our story': 'Câu chuyện của chúng tôi',
    'Why LA PLAGE': 'Vì sao là LA PLAGE',
    'LA PLAGE is beachwear made by a group of students in Saigon. We started it because a day by the sea rarely asks for one outfit: a swim in the morning, a game on the sand, a long lunch in the shade. We wanted clothes that could do all of it, and still feel considered.': 'LA PLAGE là đồ đi biển do một nhóm sinh viên ở Sài Gòn làm ra. Chúng tôi bắt đầu vì một ngày ở biển hiếm khi chỉ cần một bộ đồ: buổi sáng đi bơi, chơi một trận trên cát, rồi bữa trưa dài dưới bóng mát. Chúng tôi muốn những bộ đồ làm được tất cả những điều đó, mà vẫn chỉn chu.',
    'Our purpose is simple: make a few pieces, make them well, and let them be worn slowly, from the first dip to the last light.': 'Mục đích của chúng tôi rất đơn giản: làm ít mẫu, làm thật kỹ, và để chúng được mặc thong thả, từ lần ngâm mình đầu tiên đến tia nắng cuối ngày.',
    'Few pieces, made well': 'Ít mẫu, làm kỹ',
    'Each drop is small. We would rather make fewer things and make them properly.': 'Mỗi drop đều nhỏ. Chúng tôi thà làm ít hơn nhưng làm cho đúng.',
    'Sand & sea, both': 'Cả cát lẫn biển',
    'Shoreline to move in, Marée for long lunches. Every line belongs on the beach and in the water.': 'Shoreline để vận động, Marée cho những bữa trưa dài. Dòng nào cũng hợp trên bãi biển lẫn dưới nước.',
    'Made by students in Saigon': 'Do sinh viên Sài Gòn làm ra',
    'Designed between classes, made in Vietnam in limited runs, so each piece stays a little special. Members hear about every drop first.': 'Thiết kế giữa những giờ học, sản xuất tại Việt Nam với số lượng giới hạn, để mỗi món đồ luôn có chút đặc biệt. Thành viên luôn được biết trước về mỗi drop.',
    '10% goes to Saigon Xanh': '10% dành cho Sài Gòn Xanh',
    '10% of our profit goes to Saigon Xanh.': '10% lợi nhuận của chúng tôi được dành cho Sài Gòn Xanh.',

    // shop: lines, cards, product view (main.js + data/products.json)
    'Beach sport': 'Thể thao bãi biển',
    'Swim trunks': 'Quần bơi',
    'Old money': 'Phong cách old money',
    'Shorts made to move on the sand and in the shallows.': 'Quần short để vận động trên cát và nơi nước cạn.',
    'For the swim, from the first dip to the last light.': 'Để đi bơi, từ lần ngâm mình đầu tiên đến tia nắng cuối ngày.',
    'Seersucker and quiet stripes for long lunches by the sea.': 'Vải seersucker và những đường sọc nhã nhặn cho bữa trưa dài bên biển.',
    'Sand & sea': 'Cát & biển',
    'Detail': 'Chi tiết',
    'View': 'Xem',
    'Drag': 'Kéo',
    'Front': 'Mặt trước',
    'Back': 'Mặt sau',
    'Close': 'Đóng',
    'Colour': 'Màu',
    'Price': 'Giá',
    'Size': 'Size',
    'Pattern & colours': 'Họa tiết & màu sắc',
    'Back to the piece': 'Quay lại sản phẩm',
    'Previous product': 'Sản phẩm trước',
    'Next product': 'Sản phẩm sau',
    'Get notified': 'Nhận thông báo',
    'The collection could not be loaded. Serve the site over http to read data/products.json.': 'Không tải được bộ sưu tập. Vui lòng tải lại trang.',
    'White swim short with a hand-drawn blue toile of palms, sailboats and deck chairs, and a woven palm label.': 'Quần bơi trắng với họa tiết toile xanh vẽ tay gồm cây cọ, thuyền buồm và ghế bãi biển, cùng nhãn dệt hình cây cọ.',
    'Pink and coral tropical florals with an embroidered palm at the hem and an elastic waist.': 'Họa tiết hoa nhiệt đới hồng và san hô, cây cọ thêu ở gấu quần và lưng thun.',
    'Clean white swim short with an elastic waist and a small palm at the hem.': 'Quần bơi trắng tối giản, lưng thun và một cây cọ nhỏ ở gấu quần.',
    'Swim short with a tonal hibiscus print, an embroidered LA PLAGE patch at the hem and an elastic waist. In sky blue or pink.': 'Quần bơi họa tiết dâm bụt cùng tông, miếng thêu LA PLAGE ở gấu quần và lưng thun. Có màu xanh da trời hoặc hồng.',
    'Blue camo swim short with white hibiscus and monstera leaves and an embroidered LA PLAGE patch.': 'Quần bơi camo xanh với hoa dâm bụt trắng, lá monstera và miếng thêu LA PLAGE.',
    'Hand-drawn pink and coral florals with an embroidered LA PLAGE patch at the hem and an elastic waist.': 'Họa tiết hoa hồng và san hô vẽ tay, miếng thêu LA PLAGE ở gấu quần và lưng thun.',
    'Seersucker short in blue and white stripe with a white drawcord.': 'Quần short vải seersucker sọc xanh trắng, dây rút màu trắng.',
    'Wide sand-and-white stripes, a white rope drawcord and an embroidered LA PLAGE patch at the hem.': 'Sọc to màu cát và trắng, dây rút kiểu dây thừng màu trắng và miếng thêu LA PLAGE ở gấu quần.',
    'Seersucker short in pine green and white stripe with a white drawcord.': 'Quần short vải seersucker sọc xanh thông và trắng, dây rút màu trắng.',
    'White swim short with hand-sketched palms in olive and terracotta and an embroidered LA PLAGE patch.': 'Quần bơi trắng với những cây cọ phác tay màu ô liu và đất nung, cùng miếng thêu LA PLAGE.',
    'White tee with a small palm on the chest and hand-drawn deck chairs by the sea on the back.': 'Áo thun trắng với cây cọ nhỏ trên ngực và hình ghế bãi biển vẽ tay ở mặt sau.',
    'Lagon Short in a blue camo hibiscus print with an embroidered LA PLAGE patch': 'Quần Lagon Short họa tiết camo dâm bụt xanh, có miếng thêu LA PLAGE',
    'Corail Short with a pink and coral hand-drawn floral print and an embroidered LA PLAGE patch at the hem': 'Quần Corail Short họa tiết hoa hồng và san hô vẽ tay, miếng thêu LA PLAGE ở gấu quần',
    'Marée Short in blue and white seersucker stripe with a white drawcord and black LA PLAGE palm': 'Quần Marée Short vải seersucker sọc xanh trắng, dây rút trắng và cây cọ LA PLAGE màu đen',
    'Sable Short in wide sand and white stripes with a white drawcord and an embroidered LA PLAGE patch': 'Quần Sable Short sọc to màu cát và trắng, dây rút trắng và miếng thêu LA PLAGE',
    'Palmier Short in white with hand-sketched olive and terracotta palms and an embroidered LA PLAGE patch': 'Quần Palmier Short màu trắng với cây cọ phác tay màu ô liu và đất nung, có miếng thêu LA PLAGE',

    // size guide (product view and help page)
    'A short with the measuring points: A waist, B hips, C length, D leg opening': 'Quần short với các điểm đo: A vòng eo, B vòng mông, C chiều dài, D ống quần',
    'Measured flat': 'Đo khi đặt phẳng',
    'Waist (A)': 'Vòng eo (A)',
    'Hips (B)': 'Vòng mông (B)',
    'Front rise': 'Đáy trước',
    'Back rise': 'Đáy sau',
    'Length (C)': 'Chiều dài (C)',
    'Leg opening (D)': 'Ống quần (D)',
    'Help choosing a size': 'Cần giúp chọn size?',

    // colour guide (product view and colour-guide.html, data/colour-guide.json)
    'Pattern colours': 'Màu họa tiết',
    'Patch colours': 'Màu miếng thêu',
    'The full colour guide': 'Xem toàn bộ bảng màu',
    'Base': 'Màu nền',
    'Main': 'Màu chính',
    'Secondary': 'Màu phụ',
    'Accent': 'Màu nhấn',
    'Label': 'Nhãn',
    'Stitching': 'Đường chỉ',
    'Palm': 'Cây cọ',
    'LA PLAGE text': 'Chữ LA PLAGE',
    'Embroidery': 'Hình thêu',
    'Blue camo hibiscus': 'Camo dâm bụt xanh',
    'Palm print': 'Họa tiết cây cọ',
    'Sky-blue hibiscus': 'Dâm bụt xanh da trời',
    'Pink colourway of Riva': 'Phiên bản màu hồng của Riva',
    'Pink floral': 'Họa tiết hoa hồng',
    'Blue seersucker stripe': 'Sọc seersucker xanh',
    'Wide sand stripe': 'Sọc to màu cát',
    'Summer, worn slowly.': 'Mùa hè, mặc thật thong thả.',
    'Pattern, full size': 'Họa tiết, kích thước thật',
    'Share = how much of the printed fabric that colour covers.': 'Tỷ lệ = phần diện tích vải in mà màu đó chiếm.',
    'Brand colours': 'Màu thương hiệu',
    'The LA PLAGE palette': 'Bảng màu LA PLAGE',
    'White': 'Trắng',
    'Light sand': 'Cát nhạt',
    'Sand': 'Cát',
    'Sea blue': 'Xanh biển',
    'Deep sea': 'Biển sâu',
    'Ink': 'Mực',
    'Headlines and wordmark: Lora, tracked capitals. Italic titles: Playfair Display.': 'Tiêu đề và logo chữ: Lora, chữ in hoa giãn cách. Tiêu đề in nghiêng: Playfair Display.',
    'Loading the colour guide…': 'Đang tải bảng màu…',
    'The colour guide could not be loaded. Please refresh and try again.': 'Không tải được bảng màu. Vui lòng tải lại trang và thử lại.',

    // sign in (portal/auth-form.js) and errors (portal/firebase.js)
    'Continue with Google': 'Tiếp tục với Google',
    'New here? Signing in with Google creates your account.': 'Lần đầu ghé? Đăng nhập bằng Google sẽ tạo tài khoản cho bạn.',
    'Admins: use your admin Gmail.': 'Quản trị viên: dùng Gmail quản trị.',
    'Copy link': 'Sao chép liên kết',
    'Copy': 'Sao chép',
    'Copied': 'Đã sao chép',
    'This website address is not allowed to sign in yet. Please tell us and we will fix it.': 'Địa chỉ trang web này chưa được phép đăng nhập. Vui lòng báo cho chúng tôi để khắc phục.',
    'Google sign-in is not switched on yet. Please try again soon.': 'Đăng nhập bằng Google chưa được bật. Vui lòng thử lại sau.',
    'An account with this email already exists. Please contact us.': 'Đã có tài khoản dùng email này. Vui lòng liên hệ với chúng tôi.',
    'That username is taken. Please choose another.': 'Tên người dùng này đã có người dùng. Vui lòng chọn tên khác.',
    'Username or password is not right.': 'Tên người dùng hoặc mật khẩu chưa đúng.',
    'Too many attempts. Please wait a moment and try again.': 'Bạn đã thử quá nhiều lần. Vui lòng đợi một chút rồi thử lại.',
    'Please use a password of at least 8 characters.': 'Vui lòng dùng mật khẩu có ít nhất 8 ký tự.',
    'We could not reach the server. Please check your connection.': 'Không kết nối được máy chủ. Vui lòng kiểm tra kết nối mạng.',
    'This action is not allowed for this account.': 'Tài khoản này không được phép thực hiện thao tác này.',
    'Something went wrong. Please try again.': 'Đã có lỗi xảy ra. Vui lòng thử lại.',

    // pre-order form (portal/site.js)
    'Accounts open soon. Please check back shortly.': 'Tài khoản sắp được mở. Vui lòng quay lại sau ít phút.',
    'You have an account. Pre-orders are open: choose a piece and pre-order it.': 'Bạn đã có tài khoản. Đã mở đặt trước: hãy chọn một món đồ và đặt trước.',
    'Go to my account': 'Đến tài khoản của tôi',
    'Pre-orders join the next production batch. We confirm each one personally and arrange payment with you directly. No card details are taken here.': 'Đơn đặt trước sẽ vào mẻ sản xuất tiếp theo. Chúng tôi xác nhận từng đơn và trực tiếp trao đổi với bạn về thanh toán. Trang web không thu thông tin thẻ.',
    'Sign in with Google to place your pre-order.': 'Đăng nhập bằng Google để đặt trước.',
    'Loading your account…': 'Đang tải tài khoản của bạn…',
    'This account cannot place new pre-orders at the moment. Please contact us if you think this is a mistake.': 'Tài khoản này hiện không thể đặt trước đơn mới. Vui lòng liên hệ với chúng tôi nếu bạn nghĩ đây là nhầm lẫn.',
    'The pieces could not be loaded. Please refresh and try again.': 'Không tải được sản phẩm. Vui lòng tải lại trang và thử lại.',
    'Your pieces': 'Sản phẩm của bạn',
    'Piece': 'Sản phẩm',
    'Qty': 'SL',
    'Remove': 'Bỏ',
    'Remove this piece': 'Bỏ sản phẩm này',
    '+ Add another piece': '+ Thêm sản phẩm',
    'Full name': 'Họ và tên',
    'Phone': 'Số điện thoại',
    'Shipping address': 'Địa chỉ giao hàng',
    'Street': 'Số nhà, tên đường',
    'Ward': 'Phường/Xã',
    'City': 'Thành phố',
    'Saigon': 'Sài Gòn',
    'Hanoi': 'Hà Nội',
    'free shipping': 'miễn phí giao hàng',
    'Save this address and phone to my account': 'Lưu địa chỉ và số điện thoại này vào tài khoản của tôi',
    'How will you pay?': 'Bạn muốn thanh toán thế nào?',
    'Bank transfer': 'Chuyển khoản ngân hàng',
    'QR code': 'Mã QR',
    'Cash': 'Tiền mặt',
    'After you place your pre-order you will see how to pay (bank transfer or QR, or cash if you choose it). We start making your piece once payment arrives. Nothing is charged on this site.': 'Sau khi đặt trước, bạn sẽ thấy hướng dẫn thanh toán (chuyển khoản hoặc quét mã QR, hoặc tiền mặt nếu bạn chọn). Chúng tôi bắt đầu may khi nhận được thanh toán. Trang web không tự động trừ tiền.',
    'Subtotal': 'Tạm tính',
    'Free': 'Miễn phí',
    'Total': 'Tổng cộng',
    'Any two of Lagon, Corail and Palmier for 925.000 ₫: the price comes off automatically.': 'Chọn 2 quần bất kỳ trong Lagon, Corail và Palmier với giá 925.000 ₫: giá được giảm tự động.',
    'Place pre-order': 'Đặt trước ngay',
    'Please add your full name.': 'Vui lòng nhập họ và tên.',
    'Please add a phone number we can reach you on.': 'Vui lòng nhập số điện thoại để chúng tôi liên lạc với bạn.',
    'Please add your Gmail. We send your pre-order confirmation there.': 'Vui lòng nhập Gmail. Chúng tôi gửi xác nhận đơn đặt trước đến địa chỉ này.',
    'Please choose Saigon, Hanoi or Huế.': 'Vui lòng chọn Sài Gòn, Hà Nội hoặc Huế.',
    'Please complete the street, ward and city.': 'Vui lòng điền đủ số nhà/tên đường, phường/xã và thành phố.',
    'This pre-order could not be placed. Please check your details, or contact us if your account is paused.': 'Không thể đặt trước đơn này. Vui lòng kiểm tra lại thông tin, hoặc liên hệ với chúng tôi nếu tài khoản của bạn đang bị tạm khóa.',
    'View my pre-orders': 'Xem đơn đặt trước của tôi',

    // how to pay (portal/pay.js, firebase-config.js)
    'Pay in cash': 'Thanh toán tiền mặt',
    'Pay in cash, in person. We will contact you to arrange where and when to meet.': 'Thanh toán tiền mặt khi gặp trực tiếp. Chúng tôi sẽ liên hệ để hẹn thời gian và địa điểm.',
    'We will arrange it with you.': 'Chúng tôi sẽ trao đổi với bạn.',
    'Scan to pay': 'Quét mã để thanh toán',
    'Amount': 'Số tiền',
    'Order number': 'Mã đơn hàng',
    'Name': 'Tên',
    'Bank': 'Ngân hàng',
    'Account name': 'Tên tài khoản',
    'Account number': 'Số tài khoản',
    'Transfer note': 'Nội dung chuyển khoản',
    'Payment QR code for LA PLAGE': 'Mã QR thanh toán cho LA PLAGE',
    'Scan with any banking app': 'Quét bằng bất kỳ ứng dụng ngân hàng nào',
    'We will send you the bank details shortly.': 'Chúng tôi sẽ sớm gửi thông tin chuyển khoản cho bạn.',
    'We start on your order as soon as your payment arrives. Its status updates in your account.': 'Chúng tôi bắt đầu làm đơn của bạn ngay khi nhận được thanh toán. Trạng thái đơn được cập nhật trong tài khoản của bạn.',

    // account page (portal/account.js)
    'Accounts are opening soon. Please check back shortly.': 'Tài khoản sắp được mở. Vui lòng quay lại sau.',
    'Sign in with Google to see your pre-orders.': 'Đăng nhập bằng Google để xem các đơn đặt trước của bạn.',
    'Open the admin panel': 'Mở trang quản trị',
    'Sign out': 'Đăng xuất',
    'This account is no longer active. Please contact us.': 'Tài khoản này không còn hoạt động. Vui lòng liên hệ với chúng tôi.',
    'Pre-ordered': 'Đã đặt trước',
    'No pre-order yet': 'Chưa có đơn đặt trước',
    'This account is paused and cannot place new pre-orders. Please contact us.': 'Tài khoản này đang tạm khóa và không thể đặt trước đơn mới. Vui lòng liên hệ với chúng tôi.',
    'Username': 'Tên người dùng',
    'Joined': 'Ngày tham gia',
    'Notifications & address': 'Thông báo & địa chỉ',
    'We use your Gmail only to tell you about your pre-orders. Your address is filled in for you next time.': 'Chúng tôi chỉ dùng Gmail của bạn để thông báo về đơn đặt trước. Địa chỉ sẽ được điền sẵn cho lần sau.',
    'Gmail for notifications': 'Gmail nhận thông báo',
    'Choose a city': 'Chọn thành phố',
    'Saigon (Ho Chi Minh City)': 'Sài Gòn (TP. Hồ Chí Minh)',
    'Save': 'Lưu',
    'Your pre-orders': 'Đơn đặt trước của bạn',
    'Go to the shop': 'Đến cửa hàng',
    'Please add your Gmail. We send pre-order emails there.': 'Vui lòng nhập Gmail. Chúng tôi gửi email về đơn đặt trước đến địa chỉ này.',
    'That Gmail address does not look right.': 'Địa chỉ Gmail này có vẻ chưa đúng.',
    'Saved.': 'Đã lưu.',
    'This order was cancelled.': 'Đơn hàng này đã bị hủy.',
    'Order progress': 'Tiến độ đơn hàng',
    'Awaiting payment': 'Chờ thanh toán',
    'In process': 'Đang xử lý',
    'Being packaged': 'Đang đóng gói',
    'Shipped': 'Đã gửi hàng',
    'Delivered': 'Đã giao',
    'Cancelled': 'Đã hủy',
    'Paid': 'Đã thanh toán',
    'Payment not received yet': 'Chưa nhận được thanh toán',
    'Two-piece price': 'Giá mua 2',
    'This page could not load. Please check your connection, or pause any content blocker for this site, then refresh.': 'Không tải được trang này. Vui lòng kiểm tra kết nối, hoặc tạm tắt trình chặn nội dung cho trang này, rồi tải lại.',

    // contact (portal/contact.js)
    'Send us a message and we will answer here, on your own private page. No email needed to read the reply.': 'Gửi tin nhắn cho chúng tôi và chúng tôi sẽ trả lời ngay tại đây, trên trang riêng của bạn. Không cần email để đọc câu trả lời.',
    'Your name': 'Tên của bạn',
    'About': 'Chủ đề',
    'Message': 'Tin nhắn',
    'A general question': 'Câu hỏi chung',
    'Help with unsubscribing': 'Hỗ trợ hủy nhận email',
    'An order I placed': 'Đơn hàng tôi đã đặt',
    'Something else': 'Vấn đề khác',
    'Send message': 'Gửi tin nhắn',
    'Your earlier conversations on this device:': 'Các cuộc trò chuyện trước đây trên thiết bị này:',
    'Conversation': 'Cuộc trò chuyện',
    'Please add your name.': 'Vui lòng nhập tên.',
    'Please add a valid email address.': 'Vui lòng nhập địa chỉ email hợp lệ.',
    'Please write a message.': 'Vui lòng viết tin nhắn.',
    'Thank you. Your message was sent.': 'Cảm ơn bạn. Tin nhắn đã được gửi.',
    'We could not send your message. Please check your connection and try again.': 'Không gửi được tin nhắn. Vui lòng kiểm tra kết nối và thử lại.',
    'Your message was sent. Keep this page (bookmark it): our answer will appear here.': 'Tin nhắn đã được gửi. Hãy lưu lại trang này (đánh dấu trang): câu trả lời của chúng tôi sẽ hiện ở đây.',
    'We could not load this conversation. Please refresh.': 'Không tải được cuộc trò chuyện này. Vui lòng tải lại trang.',
    'That conversation link was not found. You can send us a new message below.': 'Không tìm thấy liên kết cuộc trò chuyện này. Bạn có thể gửi tin nhắn mới bên dưới.',
    'This conversation is closed. Send another message below to reopen it.': 'Cuộc trò chuyện này đã đóng. Gửi tin nhắn mới bên dưới để mở lại.',
    'Write back': 'Trả lời',
    'Send': 'Gửi',
    'Start a new conversation': 'Bắt đầu cuộc trò chuyện mới',
    'We could not send that. Please try again.': 'Không gửi được. Vui lòng thử lại.',
    'Sent.': 'Đã gửi.',
    'Messages are not available yet. Please try again soon.': 'Tính năng tin nhắn chưa sẵn sàng. Vui lòng thử lại sau.',
    'This page could not load. Please refresh, or pause any content blocker for this site.': 'Không tải được trang này. Vui lòng tải lại, hoặc tạm tắt trình chặn nội dung cho trang này.',

    // unsubscribe (portal/unsubscribe.js)
    'Mailing list': 'Danh sách nhận email',
    'Unsubscribe me': 'Hủy đăng ký cho tôi',
    'Subscribe me again': 'Đăng ký lại',
    'That did not work. Please try again, or <a class="link link--underlined" href="contact.html?topic=unsubscribe">send us a message</a>.': 'Không thực hiện được. Vui lòng thử lại, hoặc gửi tin nhắn cho chúng tôi ở trang Liên hệ.',
    'This page could not load. Please refresh, or use the contact page and we will remove you.': 'Không tải được trang này. Vui lòng tải lại, hoặc dùng trang Liên hệ và chúng tôi sẽ xóa bạn khỏi danh sách.',

    // help page
    'LA PLAGE is a small brand run by students in Saigon, so every question reaches one of us directly.': 'LA PLAGE là một thương hiệu nhỏ do sinh viên Sài Gòn điều hành, nên mọi câu hỏi đều đến trực tiếp tay một người trong nhóm.',
    'Where': 'Khu vực',
    'Every piece is made in a small batch, so pre-orders ship once that batch is finished. We tell you when yours is on its way.': 'Mỗi sản phẩm được làm theo mẻ nhỏ, nên đơn đặt trước sẽ được gửi đi khi mẻ đó hoàn tất. Chúng tôi sẽ báo khi đơn của bạn đang trên đường giao.',
    'Prices': 'Giá',
    'Lagon, Corail and Palmier shorts: 500.000 ₫ each, or any two for 925.000 ₫ (taken off automatically at checkout).': 'Quần Lagon, Corail và Palmier: 500.000 ₫ mỗi chiếc, hoặc 925.000 ₫ cho 2 chiếc bất kỳ (tự động giảm khi thanh toán).',
    'Marée and Sable shorts: 600.000 ₫ each.': 'Quần Marée và Sable: 600.000 ₫ mỗi chiếc.',
    "10% of our profit goes to Sài Gòn Xanh, who clean up Vietnam's beaches.": '10% lợi nhuận của chúng tôi được dành cho Sài Gòn Xanh, nhóm dọn sạch các bãi biển Việt Nam.',
    'Returns and exchanges': 'Đổi trả',
    'Our shorts come in S, M, L and XL, with an elastic waist and a drawcord. Measurements are in centimetres, taken with the short lying flat; the letters match the drawing.': 'Quần short của chúng tôi có size S, M, L và XL, lưng thun và dây rút. Số đo tính bằng centimet, đo khi quần đặt phẳng; các chữ cái tương ứng với hình vẽ.',
    'LA PLAGE short with the measuring points: A across the waist, B across the hips, C the length from waist to hem, D across the leg opening': 'Quần short LA PLAGE với các điểm đo: A ngang eo, B ngang mông, C chiều dài từ lưng đến gấu, D ngang ống quần',
    'Short measurements in centimetres, by size': 'Số đo quần short theo size, tính bằng centimet',
    'Send us a message': 'Gửi tin nhắn cho chúng tôi',

    // privacy policy
    'Last updated: 7 November 2026': 'Cập nhật lần cuối: 7 tháng 11 năm 2026',
    '1. Who is responsible for your data': '1. Ai chịu trách nhiệm về dữ liệu của bạn',
    '2. What we collect': '2. Chúng tôi thu thập gì',
    'We do not knowingly collect data from children under 16. If you believe a child has given us their data, contact us and we will delete it.': 'Chúng tôi không cố ý thu thập dữ liệu của trẻ em dưới 16 tuổi. Nếu bạn cho rằng một trẻ em đã cung cấp dữ liệu cho chúng tôi, hãy liên hệ và chúng tôi sẽ xóa dữ liệu đó.',
    '3. Why we use it': '3. Vì sao chúng tôi sử dụng dữ liệu',
    'To create and run your account, take and fulfil your pre-order, contact you about it, and deliver it.': 'Để tạo và vận hành tài khoản của bạn, tiếp nhận và thực hiện đơn đặt trước, liên hệ với bạn về đơn hàng và giao hàng.',
    'To keep the site secure, prevent abuse and meet legal and accounting obligations.': 'Để giữ an toàn cho trang web, ngăn chặn lạm dụng và đáp ứng các nghĩa vụ pháp lý, kế toán.',
    'We do not sell your personal data and we do not use it for automated decisions with legal effect.': 'Chúng tôi không bán dữ liệu cá nhân của bạn và không dùng dữ liệu đó để đưa ra quyết định tự động có hệ quả pháp lý.',
    '4. Who we share it with': '4. Chúng tôi chia sẻ dữ liệu với ai',
    'Only with the services that help us run the shop, under their own privacy terms:': 'Chỉ với các dịch vụ giúp chúng tôi vận hành cửa hàng, theo điều khoản bảo mật riêng của họ:',
    'We may also disclose data where the law or a competent authority requires it, or to protect our rights. These providers may process data outside Vietnam (including in Singapore, the United States and the EU). By giving us your data you agree to that transfer, and we choose providers that apply reasonable safeguards.': 'Chúng tôi cũng có thể tiết lộ dữ liệu khi pháp luật hoặc cơ quan có thẩm quyền yêu cầu, hoặc để bảo vệ quyền lợi của chúng tôi. Các nhà cung cấp này có thể xử lý dữ liệu bên ngoài Việt Nam (bao gồm Singapore, Hoa Kỳ và EU). Khi cung cấp dữ liệu cho chúng tôi, bạn đồng ý với việc chuyển dữ liệu đó, và chúng tôi lựa chọn các nhà cung cấp áp dụng biện pháp bảo vệ hợp lý.',
    '5. How long we keep it': '5. Chúng tôi lưu dữ liệu trong bao lâu',
    '6. Your choices and rights': '6. Lựa chọn và quyền của bạn',
    '7. Cookies and storage': '7. Cookie và lưu trữ',
    "This site does not use advertising or tracking cookies. Signing in uses your browser's local storage so you stay signed in. The fonts are loaded from Google Fonts, which may receive your IP address.": 'Trang web này không dùng cookie quảng cáo hay theo dõi. Việc đăng nhập sử dụng bộ nhớ cục bộ của trình duyệt để bạn luôn được đăng nhập. Phông chữ được tải từ Google Fonts, dịch vụ này có thể nhận địa chỉ IP của bạn.',
    '8. Security': '8. Bảo mật',
    "Data is held in Google's infrastructure behind access rules that let only you (and our admins) see your account and orders, and mailing list addresses can be read only by our admins. No online service is perfectly secure. If a breach affecting you occurs we will notify you and the authorities as the law requires.": 'Dữ liệu được lưu trên hạ tầng của Google với các quy tắc truy cập chỉ cho phép bạn (và quản trị viên của chúng tôi) xem tài khoản và đơn hàng của bạn, và chỉ quản trị viên mới đọc được các địa chỉ trong danh sách nhận email. Không có dịch vụ trực tuyến nào an toàn tuyệt đối. Nếu xảy ra sự cố rò rỉ ảnh hưởng đến bạn, chúng tôi sẽ thông báo cho bạn và cơ quan chức năng theo quy định của pháp luật.',
    '9. Changes': '9. Thay đổi',
    'We may update this policy. The date at the top shows the latest version; material changes will be announced on the site or by email.': 'Chúng tôi có thể cập nhật chính sách này. Ngày ở đầu trang cho biết phiên bản mới nhất; các thay đổi quan trọng sẽ được thông báo trên trang web hoặc qua email.',

    // terms of use
    'These terms govern your use of the LA PLAGE website, mailing list, accounts and pre-orders. By using the site you agree to them. If you do not agree, please do not use the site.': 'Các điều khoản này áp dụng cho việc bạn sử dụng trang web, danh sách nhận email, tài khoản và dịch vụ đặt trước của LA PLAGE. Khi sử dụng trang web, bạn đồng ý với các điều khoản này. Nếu không đồng ý, vui lòng không sử dụng trang web.',
    '1. About us': '1. Về chúng tôi',
    '2. Using the site': '2. Sử dụng trang web',
    "You must be at least 16 years old, or have a parent or guardian's permission. You agree to give true information, to keep your login private, to be responsible for what happens under your account, and not to misuse the site: no attempts to break, overload or scrape it, probe its security, submit false or other people's details, or use it unlawfully. We may suspend or close an account that breaks these terms.": 'Bạn phải từ 16 tuổi trở lên, hoặc được cha mẹ hay người giám hộ cho phép. Bạn đồng ý cung cấp thông tin trung thực, giữ bí mật thông tin đăng nhập, chịu trách nhiệm về mọi hoạt động trong tài khoản của mình, và không lạm dụng trang web: không tìm cách phá hoại, làm quá tải hoặc thu thập dữ liệu tự động, dò tìm lỗ hổng bảo mật, gửi thông tin giả hoặc thông tin của người khác, hay sử dụng trang web trái pháp luật. Chúng tôi có thể tạm khóa hoặc đóng tài khoản vi phạm các điều khoản này.',
    '3. Mailing list': '3. Danh sách nhận email',
    '4. Pre-orders': '4. Đặt trước',
    'Prices are shown in Vietnamese dong (VND) and shipping is free inside Saigon (Ho Chi Minh City) and 50,000 VND to Hanoi and Huế, the other cities we currently deliver to, shown at checkout. Prices, sizes, colours, quantities and availability may change, and we may limit quantities per person. If we make an obvious pricing or listing mistake we may correct it or cancel the pre-order, and refund anything you paid.': 'Giá được hiển thị bằng đồng Việt Nam (VND). Giao hàng miễn phí trong Sài Gòn (TP. Hồ Chí Minh) và 50.000 VND đến Hà Nội và Huế, hai thành phố khác mà chúng tôi hiện giao đến; phí được hiển thị khi thanh toán. Giá, size, màu sắc, số lượng và tình trạng còn hàng có thể thay đổi, và chúng tôi có thể giới hạn số lượng cho mỗi người. Nếu chúng tôi mắc lỗi rõ ràng về giá hoặc thông tin sản phẩm, chúng tôi có thể sửa lỗi hoặc hủy đơn đặt trước, và hoàn lại số tiền bạn đã trả.',
    'No card details are taken on this site. We contact you to confirm details and arrange payment directly.': 'Trang web này không thu thông tin thẻ. Chúng tôi sẽ liên hệ với bạn để xác nhận thông tin và thỏa thuận thanh toán trực tiếp.',
    'Dates shown, including delivery times, are estimates. Made-to-order production can run late; if it does we will tell you, and you may cancel an unfulfilled pre-order for a full refund of anything paid.': 'Các mốc thời gian được hiển thị, kể cả thời gian giao hàng, chỉ là ước tính. Sản xuất theo đơn có thể bị chậm; nếu vậy chúng tôi sẽ báo cho bạn, và bạn có thể hủy đơn đặt trước chưa được thực hiện để được hoàn lại toàn bộ số tiền đã trả.',
    'Pieces are made in small runs. Colours may look slightly different on screen. Please check the size information before ordering.': 'Sản phẩm được làm với số lượng nhỏ. Màu sắc có thể hơi khác so với trên màn hình. Vui lòng kiểm tra thông tin size trước khi đặt.',
    'We may cancel a pre-order if we cannot fulfil it, cannot deliver to your address, or suspect fraud or misuse, with a full refund of anything paid.': 'Chúng tôi có thể hủy đơn đặt trước nếu không thể thực hiện, không thể giao đến địa chỉ của bạn, hoặc nghi ngờ gian lận hay lạm dụng, và sẽ hoàn lại toàn bộ số tiền đã trả.',
    'Nothing in these terms limits any rights you have under Vietnamese consumer protection law that cannot be excluded.': 'Không điều khoản nào ở đây hạn chế các quyền không thể loại trừ của bạn theo pháp luật Việt Nam về bảo vệ quyền lợi người tiêu dùng.',
    '5. Our content': '5. Nội dung của chúng tôi',
    'The LA PLAGE name, logo, photos, product images, designs, text, code and artwork belong to us or our licensors and are protected by intellectual property laws. You may view them and share links to the site for personal, non-commercial use. You may not copy, sell, modify or use them commercially without our written permission.': 'Tên LA PLAGE, logo, hình ảnh, ảnh sản phẩm, thiết kế, văn bản, mã nguồn và tác phẩm minh họa thuộc về chúng tôi hoặc bên cấp phép cho chúng tôi, và được pháp luật về sở hữu trí tuệ bảo hộ. Bạn có thể xem và chia sẻ liên kết đến trang web cho mục đích cá nhân, phi thương mại. Bạn không được sao chép, bán, chỉnh sửa hay sử dụng cho mục đích thương mại khi chưa có sự cho phép bằng văn bản của chúng tôi.',
    '6. Disclaimers and liability': '6. Miễn trừ và giới hạn trách nhiệm',
    'The site and its content are provided "as is" and "as available". We do not promise that the site will always be available, uninterrupted or error free. To the fullest extent the law allows, we are not liable for indirect or consequential loss, lost profits, or loss caused by things outside our reasonable control (for example outages of Google, Vercel or EmailJS, or delivery partners\' delays). Our total liability to you for any claim relating to the site or a pre-order is limited to the amount you paid us for that pre-order. Nothing here excludes liability that cannot be excluded by law, such as for fraud or for death or personal injury caused by negligence.': 'Trang web và nội dung được cung cấp "nguyên trạng" và "tùy theo khả năng sẵn có". Chúng tôi không cam kết trang web luôn hoạt động, không bị gián đoạn hay không có lỗi. Trong phạm vi tối đa pháp luật cho phép, chúng tôi không chịu trách nhiệm về tổn thất gián tiếp hoặc hệ quả, mất lợi nhuận, hay tổn thất do các yếu tố ngoài tầm kiểm soát hợp lý của chúng tôi (ví dụ sự cố của Google, Vercel hoặc EmailJS, hay sự chậm trễ của đối tác giao hàng). Tổng trách nhiệm của chúng tôi đối với bạn cho mọi khiếu nại liên quan đến trang web hoặc một đơn đặt trước được giới hạn ở số tiền bạn đã trả cho đơn đặt trước đó. Không nội dung nào ở đây loại trừ trách nhiệm mà pháp luật không cho phép loại trừ, chẳng hạn trách nhiệm do gian lận hoặc do sơ suất gây tử vong hay thương tích.',
    '7. Links': '7. Liên kết',
    'The site may link to third-party sites (for example social media). We do not control them and are not responsible for their content or privacy practices.': 'Trang web có thể dẫn liên kết đến trang của bên thứ ba (ví dụ mạng xã hội). Chúng tôi không kiểm soát các trang đó và không chịu trách nhiệm về nội dung hay cách họ xử lý dữ liệu cá nhân.',
    '8. Changes': '8. Thay đổi',
    'We may update these terms and the date above shows the latest version. Continued use after a change means you accept it. A pre-order you have already placed stays under the terms that applied when you placed it.': 'Chúng tôi có thể cập nhật các điều khoản này; ngày ở trên cho biết phiên bản mới nhất. Việc bạn tiếp tục sử dụng sau khi có thay đổi đồng nghĩa với việc bạn chấp nhận thay đổi đó. Đơn đặt trước bạn đã đặt vẫn áp dụng các điều khoản có hiệu lực tại thời điểm đặt.',
    '9. Governing law and disputes': '9. Luật áp dụng và giải quyết tranh chấp',
  };

  // sentences with links, emphasis or bold inside (tags in the same order as on the page)
  const H = {
    'Washed up, <em>just for you.</em>': 'Sóng đưa vào, <em>dành riêng cho bạn.</em>',
    'Days by the <em>sea.</em>': 'Những ngày <em>bên biển.</em>',
    'The first <em>wash</em>': 'Con sóng <em>đầu tiên</em>',
    'Made for the hours between the <em>tide</em> and the <em>evening.</em> Few pieces. Made well. Never rushed.': 'Dành cho những giờ giữa <em>con nước</em> và <em>chiều tà.</em> Ít mẫu. Làm kỹ. Không vội vàng.',
    'One wardrobe for the <em>sand</em> and the <em>sea.</em>': 'Một tủ đồ cho cả <em>cát</em> và <em>biển.</em>',
    'Pre-orders are <em>open.</em>': 'Đã mở <em>đặt trước.</em>',
    'Each drop is small. <strong>Pre-orders are open.</strong> Sign in with Google, then choose a piece and pre-order it.': 'Mỗi drop đều nhỏ. <strong>Đã mở đặt trước.</strong> Đăng nhập bằng Google, rồi chọn món đồ bạn thích và đặt trước.',
    // pre-order form
    'Reserve your <em>piece.</em>': 'Giữ chỗ <em>món đồ của bạn.</em>',
    'Gmail <em>confirmation goes here</em>': 'Gmail <em>nhận email xác nhận</em>',
    'District <em>optional</em>': 'Quận/Huyện <em>không bắt buộc</em>',
    'City <em>shipping</em>': 'Thành phố <em>phí giao hàng</em>',
    'Note <em>optional</em>': 'Ghi chú <em>không bắt buộc</em>',
    'By placing a pre-order you agree to our <a>Terms of Use</a> and <a>Privacy Policy</a>.': 'Khi đặt trước, bạn đồng ý với <a>Điều khoản sử dụng</a> và <a>Chính sách bảo mật</a> của chúng tôi.',
    // sign in
    'By continuing you agree to our <a>Terms of Use</a> and <a>Privacy Policy</a>.': 'Khi tiếp tục, bạn đồng ý với <a>Điều khoản sử dụng</a> và <a>Chính sách bảo mật</a> của chúng tôi.',
    "Google sign-in does not work inside this app's browser. Please open <b>laplage.store</b> in <b>Safari</b> or <b>Chrome</b>. <button>Copy link</button>": 'Đăng nhập Google không hoạt động trong trình duyệt của ứng dụng này. Vui lòng mở <b>laplage.store</b> bằng <b>Safari</b> hoặc <b>Chrome</b>. <button>Sao chép liên kết</button>',
    // account
    'Your <em>account.</em>': 'Tài khoản <em>của bạn.</em>',
    'Signed in as <em>admin.</em>': 'Đã đăng nhập với quyền <em>quản trị.</em>',
    'No pre-order yet. Open any piece in the shop and choose <em>Pre-order</em>.': 'Bạn chưa có đơn đặt trước. Mở một sản phẩm bất kỳ trong cửa hàng và chọn <em>Đặt trước</em>.',
    // contact
    'Write <em>to us.</em>': 'Viết <em>cho chúng tôi.</em>',
    'Email <em>so we can also let you know when we reply</em>': 'Email <em>để chúng tôi báo cho bạn khi có trả lời</em>',
    'We use your details only to answer you. See the <a>Privacy Policy</a>.': 'Chúng tôi chỉ dùng thông tin của bạn để trả lời. Xem <a>Chính sách bảo mật</a>.',
    'Your <em>conversation.</em>': 'Cuộc trò chuyện <em>của bạn.</em>',
    // unsubscribe
    'Unsubscribe <em>from emails.</em>': 'Hủy nhận <em>email.</em>',
    'You are <em>unsubscribed.</em>': 'Bạn đã <em>hủy đăng ký.</em>',
    'Use the unsubscribe link in any email we sent you; it takes you straight to your own page. If you no longer have an email, <a>send us a message</a> from the address you signed up with and we will remove you within 3 working days.': 'Hãy dùng liên kết hủy đăng ký trong bất kỳ email nào chúng tôi đã gửi; liên kết sẽ đưa bạn thẳng đến trang riêng của bạn. Nếu không còn email nào, hãy <a>gửi tin nhắn cho chúng tôi</a> từ địa chỉ bạn đã đăng ký và chúng tôi sẽ xóa bạn khỏi danh sách trong vòng 3 ngày làm việc.',
    'This page is not available yet. Please <a>send us a message</a> and we will remove you.': 'Trang này chưa sẵn sàng. Vui lòng <a>gửi tin nhắn cho chúng tôi</a> và chúng tôi sẽ xóa bạn khỏi danh sách.',
    'Link <em>not found.</em>': 'Không tìm thấy <em>liên kết.</em>',
    'This unsubscribe link is not valid. Please <a>send us a message</a> and we will remove you within 3 working days.': 'Liên kết hủy đăng ký này không hợp lệ. Vui lòng <a>gửi tin nhắn cho chúng tôi</a> và chúng tôi sẽ xóa bạn khỏi danh sách trong vòng 3 ngày làm việc.',
    'We could not load your subscription. Please refresh, or <a>send us a message</a> and we will remove you.': 'Không tải được thông tin đăng ký của bạn. Vui lòng tải lại trang, hoặc <a>gửi tin nhắn cho chúng tôi</a> và chúng tôi sẽ xóa bạn khỏi danh sách.',
    // colour guide
    'Colour <em>guide</em>': 'Bảng <em>màu</em>',
    // help
    'How can we <em>help?</em>': 'Chúng tôi có thể <em>giúp gì?</em>',
    'For now we deliver to Saigon, Hanoi and Huế. Somewhere else? <a>Contact us</a> and we will see what we can do.': 'Hiện tại chúng tôi giao hàng đến Sài Gòn, Hà Nội và Huế. Bạn ở nơi khác? <a>Liên hệ với chúng tôi</a> và chúng tôi sẽ xem có thể hỗ trợ thế nào.',
    'You can follow each pre-order in <a>your account</a>.': 'Bạn có thể theo dõi từng đơn đặt trước trong <a>tài khoản của bạn</a>.',
    'Something wrong with your piece, or the size is not right? Email us at <a>laplage.vn@gmail.com</a> or message <a>@laplage.vn</a> on Instagram with your order name and a photo, and we will sort it out with you.': 'Sản phẩm có lỗi, hoặc size chưa vừa? Gửi email cho chúng tôi qua <a>laplage.vn@gmail.com</a> hoặc nhắn tin cho <a>@laplage.vn</a> trên Instagram, kèm tên người đặt và một tấm ảnh, chúng tôi sẽ cùng bạn giải quyết.',
    'Between two sizes? Send us your height and waist at <a>laplage.vn@gmail.com</a> and we will recommend one before you pre-order.': 'Phân vân giữa hai size? Gửi chiều cao và vòng eo của bạn qua <a>laplage.vn@gmail.com</a>, chúng tôi sẽ gợi ý size trước khi bạn đặt trước.',
    'See also our <a>privacy policy</a> and <a>terms of use</a>.': 'Xem thêm <a>chính sách bảo mật</a> và <a>điều khoản sử dụng</a> của chúng tôi.',
    // legal pages
    'Questions? <a>Contact us</a>': 'Có câu hỏi? <a>Liên hệ với chúng tôi</a>',
    'Privacy <em>Policy</em>': 'Chính sách <em>bảo mật</em>',
    'Terms of <em>Use</em>': 'Điều khoản <em>sử dụng</em>',
    'LA PLAGE ("<strong>we</strong>", "<strong>us</strong>") is a beachwear label based in Ho Chi Minh City, Vietnam. This policy explains what personal data we collect through this website, why, how long we keep it, and the choices you have. By using the site you acknowledge this policy. Where you give us your consent (for example to receive emails) we rely on it, and you can withdraw it at any time.': 'LA PLAGE ("<strong>chúng tôi</strong>") là thương hiệu đồ đi biển có trụ sở tại TP. Hồ Chí Minh, Việt Nam. Chính sách này giải thích chúng tôi thu thập dữ liệu cá nhân nào qua trang web này, vì sao, lưu trong bao lâu, và các lựa chọn của bạn. Khi sử dụng trang web, bạn xác nhận đã biết chính sách này. Khi bạn đồng ý (ví dụ để nhận email), chúng tôi dựa trên sự đồng ý đó, và bạn có thể rút lại bất cứ lúc nào.',
    'LA PLAGE, Ho Chi Minh City, Vietnam. Contact for anything in this policy: <a>our contact page</a>.': 'LA PLAGE, TP. Hồ Chí Minh, Việt Nam. Liên hệ về bất kỳ nội dung nào trong chính sách này: <a>trang liên hệ của chúng tôi</a>.',
    '<strong>Mailing list.</strong> Your email address, the date and time you signed up, where you signed up from, and your consent and unsubscribe status.': '<strong>Danh sách nhận email.</strong> Địa chỉ email của bạn, ngày giờ bạn đăng ký, nơi bạn đăng ký, cùng trạng thái đồng ý và hủy đăng ký.',
    '<strong>Account.</strong> Username, name, Gmail address, phone number, delivery address and a password (stored by Google Firebase Authentication; we never see or store your password in readable form).': '<strong>Tài khoản.</strong> Tên người dùng, họ tên, địa chỉ Gmail, số điện thoại, địa chỉ giao hàng và mật khẩu (do Google Firebase Authentication lưu trữ; chúng tôi không bao giờ thấy hay lưu mật khẩu của bạn ở dạng đọc được).',
    '<strong>Pre-orders.</strong> The pieces, sizes, colours and quantities you order, your delivery details, any note you add, totals and order status. We do not take card details on this site; payment is arranged with you directly.': '<strong>Đơn đặt trước.</strong> Sản phẩm, size, màu và số lượng bạn đặt, thông tin giao hàng, ghi chú bạn thêm, tổng tiền và trạng thái đơn. Chúng tôi không thu thông tin thẻ trên trang web này; việc thanh toán được thỏa thuận trực tiếp với bạn.',
    '<strong>Technical data.</strong> Our hosts and service providers may log your IP address, browser type and request times for security and to keep the site running.': '<strong>Dữ liệu kỹ thuật.</strong> Đơn vị lưu trữ và các nhà cung cấp dịch vụ của chúng tôi có thể ghi lại địa chỉ IP, loại trình duyệt và thời điểm truy cập của bạn để bảo mật và duy trì hoạt động của trang web.',
    'To email you when pre-orders open (20 November 2026) and about future drops, <em>only if you ticked the consent box</em>. This is marketing, and you can stop it at any time (see section 6).': 'Để gửi email cho bạn khi mở đặt trước (20 tháng 11 năm 2026) và về các drop sắp tới, <em>chỉ khi bạn đã đánh dấu ô đồng ý</em>. Đây là email tiếp thị, và bạn có thể dừng nhận bất cứ lúc nào (xem mục 6).',
    '<strong>Google Firebase</strong> (Authentication and Firestore database): stores accounts, pre-orders and the mailing list.': '<strong>Google Firebase</strong> (Authentication và cơ sở dữ liệu Firestore): lưu tài khoản, đơn đặt trước và danh sách nhận email.',
    '<strong>EmailJS</strong> (sending through our Gmail account): sends welcome and pre-order emails.': '<strong>EmailJS</strong> (gửi qua tài khoản Gmail của chúng tôi): gửi email chào mừng và email về đơn đặt trước.',
    '<strong>Vercel</strong>: hosts this website.': '<strong>Vercel</strong>: lưu trữ trang web này.',
    '<strong>Delivery partners</strong>: receive your name, phone and address to deliver your order.': '<strong>Đối tác giao hàng</strong>: nhận tên, số điện thoại và địa chỉ của bạn để giao đơn hàng.',
    '<strong>Mailing list:</strong> until you unsubscribe. After you unsubscribe we keep only your email address and unsubscribe status, so we do not email you again.': '<strong>Danh sách nhận email:</strong> cho đến khi bạn hủy đăng ký. Sau khi bạn hủy, chúng tôi chỉ giữ địa chỉ email và trạng thái hủy đăng ký, để không gửi email cho bạn nữa.',
    '<strong>Accounts and pre-orders:</strong> while your account is open and for as long afterwards as needed for delivery, warranty, accounting and legal obligations (up to 10 years for financial records).': '<strong>Tài khoản và đơn đặt trước:</strong> trong thời gian tài khoản của bạn còn hoạt động và sau đó trong thời gian cần thiết cho việc giao hàng, bảo hành, kế toán và nghĩa vụ pháp lý (tối đa 10 năm đối với chứng từ tài chính).',
    '<strong>Unsubscribe.</strong> Every email we send carries an unsubscribe link, and you can also use the <a>unsubscribe page</a> or <a>send us a message</a>. We stop marketing emails promptly and in any case within 3 working days. Service emails about a pre-order you placed may still be sent.': '<strong>Hủy đăng ký.</strong> Mọi email chúng tôi gửi đều có liên kết hủy đăng ký, và bạn cũng có thể dùng <a>trang hủy đăng ký</a> hoặc <a>gửi tin nhắn cho chúng tôi</a>. Chúng tôi sẽ ngừng gửi email tiếp thị ngay, và trong mọi trường hợp không quá 3 ngày làm việc. Email dịch vụ về đơn đặt trước bạn đã đặt vẫn có thể được gửi.',
    'You may also ask us to access, correct, delete or restrict the use of your personal data, to object to its use, to withdraw consent, or to receive a copy. We will reply within a reasonable time (30 days at most). <a>Send us a message</a> from the address you used. If you are in Vietnam, these rights come from Decree 13/2023/ND-CP on personal data protection; if you are in the EU or UK, from the GDPR / UK GDPR, and you may also complain to your local data protection authority.': 'Bạn cũng có thể yêu cầu chúng tôi cho truy cập, chỉnh sửa, xóa hoặc hạn chế sử dụng dữ liệu cá nhân của bạn, phản đối việc sử dụng, rút lại sự đồng ý, hoặc nhận một bản sao dữ liệu. Chúng tôi sẽ trả lời trong thời gian hợp lý (tối đa 30 ngày). <a>Gửi tin nhắn cho chúng tôi</a> từ địa chỉ bạn đã sử dụng. Nếu bạn ở Việt Nam, các quyền này được quy định tại Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân; nếu bạn ở EU hoặc Vương quốc Anh, theo GDPR / UK GDPR, và bạn cũng có thể khiếu nại với cơ quan bảo vệ dữ liệu tại nơi bạn sống.',
    'LA PLAGE is a beachwear label based in Ho Chi Minh City, Vietnam. Contact: <a>our contact page</a>.': 'LA PLAGE là thương hiệu đồ đi biển có trụ sở tại TP. Hồ Chí Minh, Việt Nam. Liên hệ: <a>trang liên hệ của chúng tôi</a>.',
    'If you sign up you agree to receive emails from us about pre-orders (which open on 20 November 2026), new drops and related news. Every email includes an unsubscribe link, and you can unsubscribe at any time on the <a>unsubscribe page</a>. See our <a>Privacy Policy</a> for how we handle your data. We will not sell or rent your address.': 'Khi đăng ký, bạn đồng ý nhận email từ chúng tôi về việc đặt trước (mở từ ngày 20 tháng 11 năm 2026), các drop mới và tin tức liên quan. Mọi email đều có liên kết hủy đăng ký, và bạn có thể hủy bất cứ lúc nào tại <a>trang hủy đăng ký</a>. Xem <a>Chính sách bảo mật</a> để biết cách chúng tôi xử lý dữ liệu của bạn. Chúng tôi sẽ không bán hay cho thuê địa chỉ email của bạn.',
    'A pre-order is a request to reserve pieces from an upcoming production batch. It is <strong>not</strong> a binding sale until we confirm it to you and agree payment.': 'Đơn đặt trước là yêu cầu giữ sản phẩm từ một mẻ sản xuất sắp tới. Đơn này <strong>chưa</strong> phải là giao dịch mua bán ràng buộc cho đến khi chúng tôi xác nhận với bạn và thống nhất việc thanh toán.',
    'These terms are governed by the laws of Vietnam. We will first try to resolve any dispute in good faith (use our <a>contact page</a>). If it cannot be resolved, it will be heard by the competent courts of Ho Chi Minh City, Vietnam. If you are a consumer elsewhere, you keep any mandatory protections of the country where you live.': 'Các điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Trước tiên, chúng tôi sẽ cố gắng giải quyết mọi tranh chấp một cách thiện chí (qua <a>trang liên hệ</a> của chúng tôi). Nếu không giải quyết được, tranh chấp sẽ được đưa ra tòa án có thẩm quyền tại TP. Hồ Chí Minh, Việt Nam. Nếu bạn là người tiêu dùng ở nơi khác, bạn vẫn được hưởng các biện pháp bảo vệ bắt buộc của quốc gia nơi bạn sinh sống.',
  };

  /* ---------------- text that carries a name, a price or a date ---------------- */
  const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Sept: 9, Oct: 10, Nov: 11, Dec: 12 };
  const M = '(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)';
  const P = [
    [new RegExp(`^(\\d{1,2}) ${M} (\\d{4})$`), (m) => `${m[1]} thg ${MONTHS[m[2]]}, ${m[3]}`],
    [new RegExp(`^(\\d{1,2}) ${M} (\\d{4}),? (\\d{1,2}:\\d{2})$`), (m) => `${m[4]}, ${m[1]} thg ${MONTHS[m[2]]}, ${m[3]}`],
    [/^© (\d{4}) LA PLAGE\. Made in Vietnam\.$/, (m) => `© ${m[1]} LA PLAGE. Làm tại Việt Nam.`],
    [/^(\d+) colours$/, (m) => `${m[1]} màu`],
    [/^(\d+) pieces$/, (m) => `${m[1]} mẫu`],
    [/^(\d+)% of the print$/, (m) => `${m[1]}% họa tiết`],
    [/^Two for (.+): mix any two of Lagon, Corail and Palmier\.$/, (m) => `Mua 2 chỉ ${m[1]}: chọn 2 quần bất kỳ trong Lagon, Corail và Palmier.`],
    [/^Two for (.+)$/, (m) => `Mua 2 giá ${m[1]}`],
    [/^(.+), (.+), (.+)\. View details$/, (m) => `${m[1]}, ${m[2].replace(/ or /g, ' hoặc ')}, ${m[3]}. Xem chi tiết`],
    [/^(Shoreline|Soleil|Marée|Drop 001), (.+)$/, (m) => `${m[1]}, ${tr(m[2]) || m[2]}`],
    [/^View the (.+)$/, (m) => `Xem ${m[1]}`],
    [/^Side of the (.+)$/, (m) => `Mặt của ${m[1]}`],
    [/^Pre-order the (.+)$/, (m) => `Đặt trước ${m[1]}`],
    [/^The embroidered LA PLAGE patch in the (.+) colours$/, (m) => `Miếng thêu LA PLAGE theo tông màu ${m[1]}`],
    [/^The (.+) pattern, full size$/, (m) => `Họa tiết ${m[1]}, kích thước thật`],
    [/^The (.+) pattern$/, (m) => `Họa tiết ${m[1]}`],
    [/^The (.+) short$/, (m) => `Quần ${m[1]}`],
    [/^Thank you, (.+)\. Your pre-order is in\.$/, (m) => `Cảm ơn ${m[1]}. Đơn đặt trước của bạn đã được ghi nhận.`],
    [/^A confirmation is on its way to (.+)\. Follow your order's progress in your account\.$/, (m) => `Email xác nhận đang được gửi đến ${m[1]}. Bạn có thể theo dõi tiến độ đơn hàng trong tài khoản.`],
  ];
  const HP = [
    [/^Hello, <em>(.+)<\/em>$/, (m) => `Xin chào, <em>${m[1] === 'there.' ? 'bạn.' : m[1]}</em>`],
    [/^We could not load your account\. (.*) <button>Try again<\/button>$/, (m) => `Không tải được tài khoản của bạn. ${tr(m[1]) || m[1]} <button>Thử lại</button>`],
    [/^Send <b>(.+?)<\/b> and write this exactly in the transfer note: <b>(.+?)<\/b> \(your order number, then your name\)\. It lets us match your payment\.$/,
      (m) => `Chuyển <b>${m[1]}</b> và ghi chính xác nội dung chuyển khoản: <b>${m[2]}</b> (mã đơn hàng, sau đó là tên của bạn). Nhờ vậy chúng tôi có thể đối chiếu thanh toán của bạn.`],
    [/^<strong>(.+?)<\/strong> is on our list for pre-order news and new drops\. Unsubscribe and we will not email you again\.$/,
      (m) => `<strong>${m[1]}</strong> đang nằm trong danh sách nhận tin đặt trước và các drop mới. Hủy đăng ký và chúng tôi sẽ không gửi email cho bạn nữa.`],
    [/^<strong>(.+?)<\/strong> will not receive marketing emails from LA PLAGE\. Changed your mind\? You can rejoin below\.$/,
      (m) => `<strong>${m[1]}</strong> sẽ không nhận email tiếp thị từ LA PLAGE nữa. Đổi ý? Bạn có thể đăng ký lại bên dưới.`],
    [/^Download the colour guide <span>(.*)<\/span>$/, (m) => `Tải bảng màu <span>${m[1]}</span>`],
  ];

  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  // collapse ordinary whitespace only: prices use a no-break space before ₫, which must survive
  const norm = (s) => s.replace(/[ \t\n\r\f]+/g, ' ').trim();
  function tr(s) {
    if (!s) return null;
    if (has(T, s)) return T[s];
    for (const [re, fn] of P) { const m = re.exec(s); if (m) return fn(m); }
    if (s.includes(' · ')) {   // "Pre-order · Drop 001", "LP-1A2B3C · 27 Nov 2026 · Bank transfer · Paid"
      let changed = false;
      const out = s.split(' · ').map((part) => { const t = tr(part); if (t != null) { changed = true; return t; } return part; });
      if (changed) return out.join(' · ');
    }
    return null;
  }
  window.LaPlageT = (s) => (lang === 'vi' ? (tr(norm(String(s))) || s) : s);   // for scripts that want a translated string

  if (lang !== 'vi') {
    if (document.readyState === 'loading') document.addEventListener('readystatechange', mountSwitch, { once: true });
    else mountSwitch();
    return;
  }

  /* ---------------- the page, as it loads and as scripts change it ---------------- */
  const SKIP = 'script,style,textarea,code,noscript,[data-i18n-skip],.hero__title,.slogan,.footer__tag,.logo3d,.intro,.ct-msg__text';
  const ATTRS = ['aria-label', 'alt', 'title', 'placeholder'];
  const INLINE = new Set(['EM', 'STRONG', 'B', 'I', 'A', 'SPAN', 'BR', 'BUTTON', 'SMALL']);
  const skipped = (el) => !!el.closest(SKIP) || (el.tagName === 'OPTION' && !el.hasAttribute('value'));   // a colour <option> without a value is sent with the order: leave it
  const doneText = new WeakMap();
  const doneEl = new WeakSet();

  const doText = (node) => {
    const raw = node.data;
    if (doneText.get(node) === raw || !/[A-Za-z]/.test(raw)) return;
    const t = tr(norm(raw));
    if (t == null) return;
    const out = raw.match(/^\s*/)[0] + t + raw.match(/\s*$/)[0];
    doneText.set(node, out);
    if (out !== raw) node.data = out;
  };
  const doAttr = (el, name) => {
    const v = el.getAttribute(name);
    if (!v || !/[A-Za-z]/.test(v)) return;
    const t = tr(norm(v));
    if (t != null && t !== v) el.setAttribute(name, t);
  };

  // an element holding a sentence with inline tags, e.g. "Days by the <em>sea.</em>"
  const sentenceOf = (el) => {
    if (!el.firstElementChild) return null;
    let k = '', text = false;
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { k += n.data; if (/\S/.test(n.data)) text = true; }
      else if (n.nodeType === 1) {
        if (!INLINE.has(n.tagName) || n.firstElementChild) return null;
        const t = n.tagName.toLowerCase();
        k += t === 'br' ? '<br>' : `<${t}>${n.textContent}</${t}>`;
      }
    }
    return text ? norm(k) : null;
  };
  const sentenceFor = (k) => {
    if (has(H, k)) return H[k];
    for (const [re, fn] of HP) { const m = re.exec(k); if (m) return fn(m); }
    return null;
  };
  // rebuild the sentence around the page's own elements, so links keep their addresses and buttons keep working
  const applySentence = (el, out) => {
    const kids = [...el.children];
    const nodes = [];
    const re = /<(\w+)>([\s\S]*?)<\/\1>|<br>/g;
    let last = 0, m, i = 0;
    while ((m = re.exec(out))) {
      if (m.index > last) nodes.push(document.createTextNode(out.slice(last, m.index)));
      const tag = m[0] === '<br>' ? 'BR' : m[1].toUpperCase();
      const kid = kids[i++];
      if (!kid || kid.tagName !== tag) return false;
      if (tag !== 'BR') kid.textContent = m[2];
      nodes.push(kid);
      last = re.lastIndex;
    }
    if (last < out.length) nodes.push(document.createTextNode(out.slice(last)));
    el.replaceChildren(...nodes);
    return true;
  };
  const doSentence = (el) => {
    if (doneEl.has(el)) return true;
    const k = sentenceOf(el);
    if (!k) return false;
    const out = sentenceFor(k);
    if (out == null || !applySentence(el, out)) return false;
    doneEl.add(el);
    return true;
  };

  const walk = (node) => {
    if (node.nodeType === 3) { if (node.parentElement && !skipped(node.parentElement)) doText(node); return; }
    if (node.nodeType !== 1 || skipped(node)) return;
    ATTRS.forEach((a) => { if (node.hasAttribute(a)) doAttr(node, a); });
    if (doSentence(node)) return;
    [...node.childNodes].forEach(walk);
  };
  // new text inside an element: the whole sentence may now match
  const touch = (textNode) => {
    const p = textNode.parentElement;
    if (!p || skipped(p)) return;
    if (!doneEl.has(p) && doSentence(p)) return;
    doText(textNode);
  };

  const meta = () => {
    const d = document.querySelector('meta[name="description"]');
    if (d && d.content) { const t = tr(norm(d.content)); if (t) d.content = t; }
  };

  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'childList') {
        r.addedNodes.forEach((n) => { if (n.nodeType === 3) touch(n); else walk(n); });
      } else if (r.type === 'characterData') {
        touch(r.target);
      } else if (r.type === 'attributes' && r.target.nodeType === 1 && !skipped(r.target)) {
        doAttr(r.target, r.attributeName);
      }
    }
  });

  const start = () => {
    meta();
    walk(document.documentElement);
    mountSwitch();
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  // "interactive" comes just before the page's deferred scripts run, so headings are translated before main.js animates them
  if (document.readyState === 'loading') {
    document.addEventListener('readystatechange', () => { if (document.readyState === 'interactive') start(); }, { once: true });
  } else start();
})();
