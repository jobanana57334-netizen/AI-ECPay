const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    if (!Auth.requireAuth()) return {};

    const el = document.getElementById('app');
    const orderId = el.dataset.orderId;
    const paymentResult = ref(el.dataset.paymentResult || null);

    const order = ref(null);
    const loading = ref(true);

    const statusMap = {
      pending: { label: '待付款', cls: 'bg-red-100 text-red-600' },
      paid: { label: '已付款', cls: 'bg-sage/20 text-sage' },
      failed: { label: '付款失敗', cls: 'bg-red-100 text-red-600' },
      cancelled: { label: '已取消', cls: 'bg-gray-100 text-gray-500' },
    };

    const paymentMessages = {
      success: { text: '付款成功！感謝您的購買。', cls: 'bg-sage/10 text-sage border border-sage/20' },
      failed: { text: '付款失敗，請重試。', cls: 'bg-red-50 text-red-600 border border-red-100' },
      cancel: { text: '付款已取消。', cls: 'bg-apricot/10 text-apricot border border-apricot/20' },
    };

    const cancelLoading = ref(false);
    const cancelSuccess = ref(false);

    async function handleCancelOrder() {
      if (!order.value) return;
      if (!confirm('確定要取消這張訂單嗎？')) return;

      const apiBaseUrl = (window.API_BASE_URL || '').replace(/\/$/, '');
      const cancelUrl = `${apiBaseUrl}/api/orders/${order.value.id}/cancel`;

      try {
        cancelLoading.value = true;
        const response = await fetch(cancelUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...Auth.getAuthHeaders()
          },
          credentials: 'include'
        });

        const data = await response.json();
        if (!response.ok) {
          throw data;
        }

        cancelSuccess.value = true;
        Notification.show('訂單取消成功，頁面即將重新整理', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (e) {
        Notification.show(e?.message || '取消失敗，請稍後再試', 'error');
      } finally {
        cancelLoading.value = false;
      }
    }

    onMounted(async function () {
      try {
        const res = await apiFetch('/api/orders/' + orderId);
        order.value = res.data;
      } catch (e) {
        Notification.show('載入訂單失敗', 'error');
      } finally {
        loading.value = false;
      }
    });

    return { order, loading, paymentResult, statusMap, paymentMessages, cancelLoading, cancelSuccess, handleCancelOrder };
  }
}).mount('#app');
