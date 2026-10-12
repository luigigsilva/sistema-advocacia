package org.example.advocacia;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AdvocaciaApplication {

    public static void main(String[] args) {
        SpringApplication.run(AdvocaciaApplication.class, args);
    }

}
