<?php
/**
 * Plugin Name: Mecha Blog Tutorials Widget
 * Plugin URI:  https://github.com/PabloSilvaBravo/mechatronicstore-blog
 * Description: Muestra "Tutoriales con este producto" en cada página de producto WooCommerce + endpoint bundle add-to-cart (?mecha_bundle=SKU1,SKU2,SKU3). Crea link juice bidireccional tienda ↔ blog.
 * Version:     1.1.0
 * Author:      Pablo Silva Bravo
 * License:     MIT
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit;
}

define('MBT_API_BASE', 'https://www.mechatronicstore.cl/api/blog');
define('MBT_BLOG_BASE', 'https://www.mechatronicstore.cl/blog');
define('MBT_CACHE_SECONDS', 6 * HOUR_IN_SECONDS);
define('MBT_HTTP_TIMEOUT', 5);

/**
 * Bundle add-to-cart handler (v1.1.0, Pablo 18-may-2026).
 *
 * Problema: WooCommerce default no soporta multi-add via ?add-to-cart=A,B,C
 * — espera un solo ID. El blog generaba URLs así desde el botón "Comprar todo"
 * de tutoriales que linkean 2+ productos → 404.
 *
 * Fix: este handler escucha ?mecha_bundle=SKU1,SKU2,SKU3 en cualquier
 * página WP, resuelve SKU → product_id via wc_get_product_id_by_sku(),
 * los agrega TODOS al carrito de la sesión actual, y redirige a /carrito/
 * preservando los UTMs originales para tracking del blog.
 *
 * Seguridad: SKU sanitizado, max 20 SKUs por bundle (anti-abuse),
 * skip productos no-purchasable / sin stock con warning visible.
 */
function mbt_handle_bundle_add() {
    if (empty($_GET['mecha_bundle']) || !function_exists('WC')) {
        return;
    }
    $cart = WC()->cart;
    if (!$cart) return;

    $raw = sanitize_text_field(wp_unslash($_GET['mecha_bundle']));
    $skus = array_slice(
        array_filter(array_map('trim', explode(',', $raw))),
        0, 20
    );
    if (empty($skus)) return;

    $added = 0;
    $skipped = [];
    foreach ($skus as $sku) {
        // Validación básica del SKU (alfanumérico + dash/underscore)
        if (!preg_match('/^[A-Za-z0-9_-]{1,32}$/', $sku)) {
            $skipped[] = $sku . ' (formato inválido)';
            continue;
        }
        $product_id = wc_get_product_id_by_sku($sku);
        if (!$product_id) {
            $skipped[] = $sku . ' (SKU no encontrado)';
            continue;
        }
        $product = wc_get_product($product_id);
        if (!$product || !$product->is_purchasable()) {
            $skipped[] = $sku . ' (no disponible)';
            continue;
        }
        $cart_item_key = $cart->add_to_cart($product_id, 1);
        if ($cart_item_key) {
            $added++;
        } else {
            $skipped[] = $sku . ' (error al agregar)';
        }
    }

    // Notice flash: WC los muestra arriba del carrito
    if ($added > 0) {
        wc_add_notice(
            sprintf(
                _n('%d producto del tutorial agregado al carrito.', '%d productos del tutorial agregados al carrito.', $added, 'mbt'),
                $added
            ),
            'success'
        );
    }
    if (!empty($skipped)) {
        wc_add_notice(
            'Productos del tutorial no agregados: ' . implode(', ', $skipped),
            'notice'
        );
    }

    // Redirect preservando UTMs (utm_source, utm_medium, utm_campaign, utm_content)
    $cart_url = wc_get_cart_url();
    $utms = [];
    foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as $k) {
        if (!empty($_GET[$k])) {
            $utms[$k] = sanitize_text_field(wp_unslash($_GET[$k]));
        }
    }
    if (!empty($utms)) {
        $cart_url = add_query_arg($utms, $cart_url);
    }
    wp_safe_redirect($cart_url);
    exit;
}
add_action('wp_loaded', 'mbt_handle_bundle_add', 20);

/**
 * Resuelve el SKU del producto WooCommerce actual.
 * El blog usa SKUs (D-517, B-450V1, etc.) — no IDs internos de WP.
 */
function mbt_get_current_product_sku() {
    if (!function_exists('wc_get_product')) {
        return null;
    }
    global $product;
    if (!($product instanceof WC_Product)) {
        $post_id = get_the_ID();
        if (!$post_id) return null;
        $product = wc_get_product($post_id);
        if (!$product) return null;
    }
    $sku = $product->get_sku();
    return $sku ? trim($sku) : null;
}

/**
 * Fetch tutorials linkeados a un SKU. Cacheado en wp_options via transient.
 */
function mbt_fetch_tutorials($sku) {
    $cache_key = 'mbt_tutorials_' . md5($sku);
    $cached = get_transient($cache_key);
    if ($cached !== false) {
        return $cached;
    }

    $url = MBT_API_BASE . '/tutorials?product_id=' . rawurlencode($sku) . '&limit=5';
    $response = wp_remote_get($url, ['timeout' => MBT_HTTP_TIMEOUT]);

    if (is_wp_error($response)) {
        // No cachear errores transitorios — reintentar al próximo page view.
        return [];
    }

    $code = wp_remote_retrieve_response_code($response);
    if ($code !== 200) {
        return [];
    }

    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    if (!is_array($data) || !isset($data['tutorials']) || !is_array($data['tutorials'])) {
        return [];
    }

    set_transient($cache_key, $data['tutorials'], MBT_CACHE_SECONDS);
    return $data['tutorials'];
}

/**
 * Render del widget HTML.
 */
function mbt_render_widget($tutorials) {
    if (empty($tutorials)) {
        return '';
    }
    $count = count($tutorials);
    $label = $count === 1 ? 'tutorial' : 'tutoriales';

    ob_start();
    ?>
    <section class="mbt-widget" style="margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid #e5e7eb;">
        <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:1rem;">
            📚 <?php echo intval($count); ?> <?php echo esc_html($label); ?> con este producto
        </h3>
        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:0.75rem;">
            <?php foreach ($tutorials as $t): ?>
                <li style="border:1px solid #e5e7eb;border-radius:0.5rem;overflow:hidden;">
                    <a
                        href="<?php echo esc_url($t['url']); ?>"
                        rel="noopener"
                        style="display:flex;gap:1rem;text-decoration:none;color:inherit;padding:0.75rem;"
                    >
                        <?php if (!empty($t['hero_image_url'])): ?>
                            <img
                                src="<?php echo esc_url($t['hero_image_url']); ?>"
                                alt="<?php echo esc_attr($t['title']); ?>"
                                loading="lazy"
                                style="width:96px;height:72px;object-fit:cover;border-radius:0.25rem;flex-shrink:0;"
                            />
                        <?php endif; ?>
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:600;font-size:0.95rem;line-height:1.3;">
                                <?php echo esc_html($t['title']); ?>
                            </div>
                            <?php if (!empty($t['subtitle'])): ?>
                                <div style="color:#6b7280;font-size:0.875rem;margin-top:0.25rem;line-height:1.3;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
                                    <?php echo esc_html($t['subtitle']); ?>
                                </div>
                            <?php endif; ?>
                        </div>
                    </a>
                </li>
            <?php endforeach; ?>
        </ul>
    </section>
    <?php
    return ob_get_clean();
}

/**
 * Hook principal: render del widget al final del summary del producto.
 * Priority 25 → después del meta default pero antes del tab de reviews.
 */
function mbt_render_in_product_page() {
    $sku = mbt_get_current_product_sku();
    if (!$sku) return;
    $tutorials = mbt_fetch_tutorials($sku);
    if (empty($tutorials)) return;
    echo mbt_render_widget($tutorials);
}
add_action('woocommerce_after_single_product_summary', 'mbt_render_in_product_page', 25);

/**
 * Shortcode alternativo: [mecha_blog_tutorials sku="D-517"] o sin sku para uso en página WC.
 */
function mbt_shortcode($atts) {
    $atts = shortcode_atts(['sku' => ''], $atts, 'mecha_blog_tutorials');
    if (empty($atts['sku'])) {
        $sku = mbt_get_current_product_sku();
    } else {
        $sku = trim($atts['sku']);
    }
    if (!$sku) return '';
    $tutorials = mbt_fetch_tutorials($sku);
    return mbt_render_widget($tutorials);
}
add_shortcode('mecha_blog_tutorials', 'mbt_shortcode');

/**
 * Admin: clear cache de un SKU específico — útil cuando el blog publica
 * un nuevo tutorial y queremos invalidación inmediata sin esperar 6h.
 */
function mbt_admin_clear_cache() {
    if (!current_user_can('manage_options')) {
        wp_die('Not allowed.');
    }
    if (!isset($_POST['mbt_nonce']) || !wp_verify_nonce($_POST['mbt_nonce'], 'mbt_clear')) {
        wp_die('Bad nonce.');
    }
    $sku = isset($_POST['sku']) ? sanitize_text_field($_POST['sku']) : '';
    if ($sku) {
        delete_transient('mbt_tutorials_' . md5($sku));
        wp_redirect(admin_url('options-general.php?page=mbt-settings&cleared=1'));
        exit;
    }
    wp_die('Missing sku.');
}
add_action('admin_post_mbt_clear_cache', 'mbt_admin_clear_cache');

/**
 * Settings page mínima — clear cache manual.
 */
function mbt_settings_page() {
    ?>
    <div class="wrap">
        <h1>Mecha Blog Tutorials</h1>
        <?php if (isset($_GET['cleared'])): ?>
            <div class="notice notice-success"><p>Cache cleared.</p></div>
        <?php endif; ?>
        <p>Plugin que muestra tutoriales del blog (mechatronicstore.cl/blog) en páginas de producto Woo.</p>
        <h2>Endpoint</h2>
        <pre><?php echo esc_html(MBT_API_BASE . '/tutorials?product_id=D-517'); ?></pre>
        <h2>Limpiar cache de un SKU</h2>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <input type="hidden" name="action" value="mbt_clear_cache">
            <?php wp_nonce_field('mbt_clear', 'mbt_nonce'); ?>
            <input type="text" name="sku" placeholder="D-517" required>
            <button type="submit" class="button button-primary">Limpiar cache</button>
        </form>
    </div>
    <?php
}
function mbt_admin_menu() {
    add_options_page(
        'Mecha Blog Tutorials',
        'Mecha Blog Tutorials',
        'manage_options',
        'mbt-settings',
        'mbt_settings_page'
    );
}
add_action('admin_menu', 'mbt_admin_menu');
