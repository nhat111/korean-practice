package com.koreanpractice.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class WebConfig {

    /**
     * CORS runs as the first servlet filter so that every response, including a
     * 401 from {@link AccessKeyFilter}, carries CORS headers the browser can read.
     */
    @Bean
    FilterRegistrationBean<CorsFilter> corsFilter(AppProperties props) {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(props.corsAllowedOrigins());
        config.addAllowedMethod("GET");
        config.addAllowedMethod("POST");
        config.addAllowedMethod("PUT");
        config.addAllowedHeader("Content-Type");
        config.addAllowedHeader(AccessKeyFilter.HEADER);
        config.setMaxAge(3600L);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);

        var bean = new FilterRegistrationBean<>(new CorsFilter(source));
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return bean;
    }

    @Bean
    FilterRegistrationBean<AccessKeyFilter> accessKeyFilter(AppProperties props) {
        var bean = new FilterRegistrationBean<>(new AccessKeyFilter(props));
        bean.addUrlPatterns("/api/*");
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE + 10);
        return bean;
    }
}
