from abc import ABC, abstractmethod

class IKeyLogger(ABC):
    @abstractmethod
    def logging_start(self):
        pass

    @abstractmethod
    def logging_stop(self):
        pass

    @abstractmethod
    def keys_logged_get(self):
        pass