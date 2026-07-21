package com.valkyrias.agency.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class IndexController {

    @GetMapping("/")
    public String index() {
        // Returns the index.html Thymeleaf template from src/main/resources/templates/
        return "index";
    }
}
