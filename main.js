/**
 * main.js — khởi tạo flipbook (turn.js), xử lý responsive và các luồng SweetAlert.
 * Tách riêng khỏi thư viện turn.js (app.js) để dễ bảo trì.
 */
(function ($) {
  "use strict";

  // Kích thước gốc của sách (tỉ lệ được giữ nguyên khi scale).
  var NATIVE = { wrapper: 670, pagesW: 620, pagesH: 445 };

  // Một đối tượng Audio duy nhất để play/pause hoạt động đúng.
  var bgMusic = new Audio("./music.mp3");
  bgMusic.loop = true;

  var $pages;

  /**
   * Co/giãn sách vừa với khung nhìn. turn.js dùng offsetLeft/offsetTop để
   * tính vị trí chạm nên KHÔNG dùng được CSS transform:scale — phải resize
   * thật bằng turn('size').
   */
  function fitBook() {
    if (!$pages || !$pages.data()) return;

    var available = document.documentElement.clientWidth - 24; // chừa lề 12px mỗi bên
    var wrapperW = Math.min(NATIVE.wrapper, available);

    $(".book-wrapper").css("width", wrapperW + "px");

    var pagesW = Math.round(wrapperW * (NATIVE.pagesW / NATIVE.wrapper));
    var pagesH = Math.round(pagesW * (NATIVE.pagesH / NATIVE.pagesW));

    $pages.turn("size", pagesW, pagesH);

    // Cho cỡ chữ co theo kích thước sách để không bị tràn khi thu nhỏ trên
    // mobile. Ở kích thước gốc (pagesW = NATIVE.pagesW) chữ là 18px, nhỏ hơn
    // thì chữ nhỏ theo đúng tỉ lệ giống hệt bố cục trên desktop.
    $pages.css("font-size", (pagesW / NATIVE.pagesW) * 18 + "px");
  }

  // Debounce resize để tránh gọi turn('size') quá nhiều lần.
  var resizeTimer;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitBook, 150);
  }

  function initBook() {
    $pages = $(".pages");
    $pages.turn({
      duration: 1500,
      width: NATIVE.pagesW,
      height: NATIVE.pagesH,
      turnCorners: "bl,br",
      elevation: 300,
      when: {
        turned: function () {
          // console.log('Current view: ', $(this).turn('view'));
        },
      },
    });

    fitBook();
    $(window).on("resize orientationchange", onResize);
  }

  /* ----------------------- Các luồng SweetAlert ----------------------- */

  function showConfirm() {
    Swal.fire({
      title: "Em có muốn nghe chút nhạc không ?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Có",
      cancelButtonText: "Không",
    }).then(function (result) {
      if (result.isConfirmed) {
        bgMusic.play().catch(function () {});
        Swal.fire(
          "Vậy thì mình bắt đầu nha ! Em click vào góc hoặc kéo chuột ở góc sách để lật từng trang nè ^^",
        );
      } else {
        Swal.fire("OK ! Khum nghe nhạc thì mình lật sách luôn nha ~~");
      }
    });
  }

  /**
   * Copy một ảnh vào clipboard. Clipboard API chỉ hỗ trợ chắc chắn image/png
   * nên ảnh (kể cả jpg) được vẽ qua canvas rồi xuất sang png trước khi copy.
   * Trả về Promise — resolve khi copy xong, reject nếu trình duyệt chặn.
   */
  function copyImageToClipboard(src) {
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      return Promise.reject(new Error("Clipboard API không khả dụng"));
    }

    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        var canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d").drawImage(img, 0, 0);
        canvas.toBlob(function (png) {
          if (!png) {
            reject(new Error("Không tạo được ảnh png"));
            return;
          }
          navigator.clipboard
            .write([new ClipboardItem({ "image/png": png })])
            .then(resolve, reject);
        }, "image/png");
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  /**
   * Popup hiển thị ảnh trả lời kèm nút "Copy ảnh" để em gửi lại cho anh.
   */
  function showCopyImage(imageUrl) {
    Swal.fire({
      title:
        "Em nhấn copy và gửi ảnh này cho anh nhé, để anh biết được câu trả lời cụa em ^^",
      imageUrl: imageUrl,
      imageWidth: 400,
      imageAlt: "Câu trả lời của em",
      showCancelButton: true,
      confirmButtonText: "Copy ảnh",
      cancelButtonText: "Đóng",
      showLoaderOnConfirm: true,
      allowOutsideClick: function () {
        return !Swal.isLoading();
      },
      preConfirm: function () {
        return copyImageToClipboard(imageUrl)
          .then(function () {
            return true;
          })
          .catch(function () {
            Swal.showValidationMessage(
              "Trình duyệt không cho copy tự động, em nhấn giữ vào ảnh để lưu rồi gửi cho anh nha ~",
            );
            return false;
          });
      },
    }).then(function (result) {
      if (result.isConfirmed && result.value) {
        Swal.fire({
          title: "Đã copy ảnh rồi nha! Em dán vào tin nhắn gửi cho anh nhé ^^",
          icon: "success",
        });
      }
    });
  }

  function showQuestion() {
    Swal.fire({
      title: "Tối chủ nhật tuần này em rảnh không? Anh muốn hẹn em đi chơi",
      icon: "question",
      input: "radio",
      inputOptions: {
        coa: "Em cóa",
        ban: "Em bận mất rui",
        tuchoi: "Em từ chối",
      },
      inputValidator: function (value) {
        if (!value) return "Em chọn một lựa chọn nha";
      },
    }).then(function (result) {
      if (!result.isConfirmed) return;
      var choice = result.value;

      if (choice === "coa") {
        Swal.fire({
          title: "Yahhhh, đã quá trời hehehe",
          imageUrl: "./img/she-say-yes.png",
          imageWidth: 400,
          imageHeight: 200,
          imageAlt: "Custom image",
        }).then(function () {
          showCopyImage("./img/yes-i-do.jpg");
        });
      } else if (choice === "ban") {
        Swal.fire({
          title: "Hem sao, mình còn nhiều dịp mà babe^^",
          imageUrl: "./img/meobuon.png",
          imageWidth: 400,
          imageHeight: 170,
          imageAlt: "Custom image",
        }).then(function () {
          showCopyImage("./img/em-ban-roi.jpg");
        });
      } else if (choice === "tuchoi") {
        Swal.fire("Chức năng từ chối đang bảo trì, em chọn lại giúp anh nha!").then(
          showQuestion,
        );
      }
    });
  }

  /* ----------------------------- Khởi động ----------------------------- */

  // Ảnh cần tải xong trước khi dựng sách để tránh giật/vỡ layout lần đầu.
  var CRITICAL_IMAGES = [
    "./img/bookcover.webp",
    "./img/page-bg.webp",
    "./img/page-bg-flower.webp",
    "./img/anh-1.webp",
  ];

  // Tải trước ảnh; mỗi ảnh resolve khi xong hoặc lỗi (không chặn vì 1 ảnh hỏng).
  function preloadImages(urls) {
    return Promise.all(
      urls.map(function (url) {
        return new Promise(function (resolve) {
          var img = new Image();
          img.onload = img.onerror = resolve;
          img.src = url;
        });
      }),
    );
  }

  function start() {
    initBook();
    $(".book-wrapper").addClass("is-ready"); // hiện sách (fade-in)
    showConfirm();

    // Dùng event delegation vì turn.js chỉ giữ vài trang trong DOM tại một thời
    // điểm — nút ".question" ở trang cuối chưa tồn tại lúc này và sẽ được nạp
    // vào (hoặc gỡ ra rồi nạp lại) khi lật sách.
    $(document).on("click", ".question", showQuestion);
  }

  $(function () {
    // Chờ ảnh tải xong, nhưng tối đa 4s để không bao giờ treo trang.
    var started = false;
    function startOnce() {
      if (started) return;
      started = true;
      start();
    }

    preloadImages(CRITICAL_IMAGES).then(startOnce);
    setTimeout(startOnce, 4000);
  });
})(jQuery);
