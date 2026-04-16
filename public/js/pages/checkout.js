const { createApp, ref, computed, onMounted } = Vue;

createApp({
  setup() {
    if (!Auth.requireAuth()) return {};

    const loading = ref(true);
    const submitting = ref(false);
    const cartItems = ref([]);
    const form = ref({ recipientName: '', recipientEmail: '', recipientAddress: '' });
    const errors = ref({});

    const cartTotal = computed(function () {
      return cartItems.value.reduce(function (sum, item) {
        return sum + item.product.price * item.quantity;
      }, 0);
    });

    function validate() {
      errors.value = {};
      if (!form.value.recipientName.trim()) errors.value.recipientName = '請輸入收件人姓名';
      if (!form.value.recipientEmail.trim()) {
        errors.value.recipientEmail = '請輸入 Email';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.recipientEmail)) {
        errors.value.recipientEmail = 'Email 格式不正確';
      }
      if (!form.value.recipientAddress.trim()) errors.value.recipientAddress = '請輸入收件地址';
      return Object.keys(errors.value).length === 0;
    }

    async function submitOrder() {
      if (!validate() || submitting.value) return;
      submitting.value = true;
      let orderId = null;
      let redirectMessageNode = null;

      function showRedirectMessage() {
        if (redirectMessageNode) return;
        redirectMessageNode = document.createElement('div');
        redirectMessageNode.id = 'ecpay-redirect-message';
        redirectMessageNode.className = 'fixed inset-x-0 top-20 mx-auto w-full max-w-md rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-center px-4 py-3 shadow-lg z-50';
        redirectMessageNode.textContent = '正在導向安全支付頁面...';
        document.body.appendChild(redirectMessageNode);
      }

      function hideRedirectMessage() {
        if (!redirectMessageNode) return;
        redirectMessageNode.remove();
        redirectMessageNode = null;
      }

      try {
        const createRes = await apiFetch('/api/orders', {
          method: 'POST',
          body: JSON.stringify(form.value)
        });

        orderId = createRes.data.id;
        showRedirectMessage();
        await new Promise(resolve => setTimeout(resolve, 1200));

        const payRes = await apiFetch(`/api/orders/${orderId}/pay`, {
          method: 'POST'
        });

        const { ecpayUrl, formData, html } = payRes.data;
        let paymentForm = null;

        if (html) {
          const wrapper = document.createElement('div');
          wrapper.innerHTML = html;
          paymentForm = wrapper.querySelector('form');
          if (paymentForm) document.body.appendChild(wrapper);
        }

        if (!paymentForm) {
          paymentForm = document.createElement('form');
          paymentForm.method = 'POST';
          paymentForm.action = ecpayUrl;
          paymentForm.style.display = 'none';

          Object.entries(formData || {}).forEach(([name, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value;
            paymentForm.appendChild(input);
          });

          document.body.appendChild(paymentForm);
        }

        paymentForm.submit();
      } catch (err) {
        hideRedirectMessage();
        const message = err?.data?.message || '付款流程失敗，請稍後再試。';
        Notification.show(message, 'error');
        if (orderId) {
          window.location.href = `/orders/${orderId}`;
        }
      } finally {
        submitting.value = false;
      }
    }

    onMounted(async function () {
      try {
        const res = await apiFetch('/api/cart');
        cartItems.value = res.data.items;
        if (cartItems.value.length === 0) {
          window.location.href = '/cart';
          return;
        }
      } catch (e) {
        window.location.href = '/cart';
        return;
      }
      loading.value = false;
    });

    return { loading, submitting, cartItems, form, errors, cartTotal, submitOrder };
  }
}).mount('#app');
